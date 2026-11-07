import { beforeEach, describe, expect, it } from '@jest/globals';

import { createInMemoryThresholdRepository } from './alert.repository';
import type { ThresholdRepository } from './alert.repository';
import type { BudgetAlert, BudgetSnapshot } from './alert.types';
import { evaluateBudgetAlerts } from './useAlerts';
import type { AlertDependencies } from './useAlerts';

// Entretenimiento USD 55 with thresholds of 50% and 90% (+ the automatic 100%): the example table
// of business-rules.md, played step by step through the evaluator.
let thresholds: ThresholdRepository;
let snapshots: Record<string, BudgetSnapshot>;
let sent: BudgetAlert[];
let deps: AlertDependencies;

const snapshot = (
  budgetId: string,
  spentMinor: number,
  overrides: Partial<BudgetSnapshot> = {},
): BudgetSnapshot => ({
  budgetId,
  categoryLabel: 'Entretenimiento',
  currency: 'USD',
  spentMinor,
  availableMinor: 5500,
  notifies: true,
  ...overrides,
});

async function spend(spentMinor: number, budgetId = 'b1', options?: { notify?: boolean }) {
  snapshots[budgetId] = { ...(snapshots[budgetId] ?? snapshot(budgetId, 0)), spentMinor };
  await evaluateBudgetAlerts(deps, [budgetId], options);
}

const thresholdsSent = () => sent.map((alert) => alert.threshold);

beforeEach(async () => {
  let n = 0;
  thresholds = createInMemoryThresholdRepository(() => `t-${(n += 1)}`);
  snapshots = { b1: snapshot('b1', 0) };
  sent = [];
  deps = {
    thresholds,
    loadSnapshots: (ids) =>
      Promise.resolve(ids.flatMap((id) => (snapshots[id] ? [snapshots[id]] : []))),
    notify: (alert) => {
      sent.push(alert);
      return Promise.resolve();
    },
    now: () => new Date('2026-11-06T10:00:00Z'),
  };
  await thresholds.replaceConfigurable('b1', [50, 90]);
});

describe('evaluator: the example table of business-rules.md', () => {
  it('USD 30 -> 50% alert, USD 50 -> 90%, USD 56 -> 100%, USD 70 -> nothing', async () => {
    await spend(3000);
    expect(thresholdsSent()).toEqual([50]);

    await spend(5000);
    expect(thresholdsSent()).toEqual([50, 90]);

    await spend(5600);
    expect(thresholdsSent()).toEqual([50, 90, 100]);

    await spend(7000); // RN-29: exceeded, no more alerts
    expect(thresholdsSent()).toEqual([50, 90, 100]);
  });

  it('RN-27 evaluating again without a change sends nothing more', async () => {
    await spend(3000);
    await spend(3000);
    await spend(3100);

    expect(thresholdsSent()).toEqual([50]);
  });

  it('RN-28 one change that crosses several thresholds sends one alert with the highest', async () => {
    await spend(5000); // from nothing to 90.9%

    expect(thresholdsSent()).toEqual([90]);

    // ...and the 50% was recorded too, so it does not come later.
    await spend(5100);
    expect(thresholdsSent()).toEqual([90]);
  });

  it('RN-27 after a refund drops the usage, the thresholds can notify again', async () => {
    await spend(5600);
    expect(thresholdsSent()).toEqual([100]);

    await spend(2000); // a refund: 36%, everything is cleared
    await spend(3000); // 54.5% again
    expect(thresholdsSent()).toEqual([100, 50]);
  });

  it('RN-27 an income that gives more room clears the thresholds it fell under', async () => {
    await spend(3000);
    expect(thresholdsSent()).toEqual([50]);

    snapshots.b1 = snapshot('b1', 3000, { availableMinor: 11000 }); // income: 27%
    await evaluateBudgetAlerts(deps, ['b1']);
    snapshots.b1 = snapshot('b1', 3000, { availableMinor: 5500 }); // income removed: 54.5% again
    await evaluateBudgetAlerts(deps, ['b1']);

    expect(thresholdsSent()).toEqual([50, 50]);
  });

  it('RN-25 the automatic 100% exists even if the user chose no thresholds', async () => {
    await thresholds.replaceConfigurable('b1', []);

    await spend(5600);

    expect(thresholdsSent()).toEqual([100]);
    expect((await thresholds.list('b1')).map((t) => t.percentage)).toEqual([100]);
  });

  it('RN-30 closed and deleted budgets do not notify, even when over the limit', async () => {
    snapshots.b1 = snapshot('b1', 9000, { notifies: false });

    await evaluateBudgetAlerts(deps, ['b1']);

    expect(sent).toEqual([]);
    expect((await thresholds.listSentIds('b1')).size).toBe(0);
  });

  it('RN-30 a budget that is in its grace period still notifies', async () => {
    snapshots.b1 = snapshot('b1', 3000, { notifies: true }); // the composition root says grace = notifies

    await evaluateBudgetAlerts(deps, ['b1']);

    expect(thresholdsSent()).toEqual([50]);
  });

  it('carries what the message needs: category, amounts and the threshold', async () => {
    await spend(3000);

    expect(sent[0]).toEqual({
      budgetId: 'b1',
      categoryLabel: 'Entretenimiento',
      currency: 'USD',
      threshold: 50,
      spentMinor: 3000,
      availableMinor: 5500,
    });
  });

  it('each budget keeps its own records', async () => {
    await thresholds.replaceConfigurable('b2', [50]);
    snapshots.b2 = snapshot('b2', 0, { categoryLabel: 'Transporte' });

    await spend(3000, 'b1');
    await spend(3000, 'b2');

    expect(sent.map((alert) => [alert.categoryLabel, alert.threshold])).toEqual([
      ['Entretenimiento', 50],
      ['Transporte', 50],
    ]);
  });

  it('evaluates several budgets in one call and ignores ids it does not know', async () => {
    await thresholds.replaceConfigurable('b2', [50]);
    snapshots.b1 = snapshot('b1', 3000);
    snapshots.b2 = snapshot('b2', 3000, { categoryLabel: 'Transporte' });

    await evaluateBudgetAlerts(deps, ['b1', 'b2', 'b2', 'ghost']);

    expect(sent).toHaveLength(2);
  });

  it('with no budgets it does nothing', async () => {
    await evaluateBudgetAlerts(deps, []);

    expect(sent).toEqual([]);
  });

  it('with notify: false it records what was crossed but tells nobody', async () => {
    await spend(5000, 'b1', { notify: false });

    expect(sent).toEqual([]);
    expect((await thresholds.listSentIds('b1')).size).toBe(2); // 50% and 90% recorded

    await spend(5100); // later evaluations do not repeat them
    expect(sent).toEqual([]);
  });
});
