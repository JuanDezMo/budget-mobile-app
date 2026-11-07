import { describe, expect, it } from '@jest/globals';

import { err, ok } from '@/core/shared/result';

import {
  evaluateThresholds,
  hasReachedThreshold,
  parseThresholdText,
  validateConfigurableThresholds,
} from './alert.rules';
import type { Threshold } from './alert.types';

describe('RN-24 / RN-25 threshold configuration', () => {
  it('RN-24 accepts none, one, two or three thresholds, sorted', () => {
    expect(validateConfigurableThresholds([])).toEqual(ok([]));
    expect(validateConfigurableThresholds([50])).toEqual(ok([50]));
    expect(validateConfigurableThresholds([90, 50])).toEqual(ok([50, 90]));
    expect(validateConfigurableThresholds([75, 25, 50])).toEqual(ok([25, 50, 75]));
  });

  it('RN-24 rejects more than three', () => {
    expect(validateConfigurableThresholds([10, 20, 30, 40])).toEqual(err('THRESHOLD_TOO_MANY'));
  });

  it('RN-24 only whole numbers from 1 to 99 are valid choices', () => {
    for (const value of [0, -5, 101, 50.5, Number.NaN]) {
      expect(validateConfigurableThresholds([value])).toEqual(err('THRESHOLD_INVALID'));
    }
    expect(validateConfigurableThresholds([1])).toEqual(ok([1]));
    expect(validateConfigurableThresholds([99])).toEqual(ok([99]));
  });

  it('RN-24 rejects repeated thresholds', () => {
    expect(validateConfigurableThresholds([50, 50])).toEqual(err('THRESHOLD_DUPLICATE'));
  });

  it('RN-25 the 100% is automatic, so it cannot be chosen again', () => {
    expect(validateConfigurableThresholds([100])).toEqual(err('THRESHOLD_AUTOMATIC'));
  });

  it('turns the typed text into a number, and refuses anything else', () => {
    expect(parseThresholdText(' 50 ')).toEqual(ok(50));
    for (const text of ['', ' ', 'abc', '5.5', '-3', '1e2', '1000']) {
      expect(parseThresholdText(text)).toEqual(err('THRESHOLD_INVALID'));
    }
  });
});

describe('reaching a threshold', () => {
  it('is exact at the threshold: 90% of 55 is 49.5', () => {
    expect(hasReachedThreshold(4950, 5500, 90)).toBe(true);
    expect(hasReachedThreshold(4949, 5500, 90)).toBe(false);
  });

  it('is not fooled by decimals: 3300 of 5500 is exactly 60%', () => {
    expect(hasReachedThreshold(3300, 5500, 60)).toBe(true);
  });

  it('works with the largest amounts allowed', () => {
    expect(hasReachedThreshold(99_999_999_999_999, 99_999_999_999_999, 100)).toBe(true);
    expect(hasReachedThreshold(99_999_999_999_998, 99_999_999_999_999, 100)).toBe(false);
  });
});

// Entretenimiento USD 55 with thresholds of 50% and 90% (+ the automatic 100%): the example table.
const thresholds: Threshold[] = [
  { id: 't50', budgetId: 'b1', percentage: 50, isAutomatic: false },
  { id: 't90', budgetId: 'b1', percentage: 90, isAutomatic: false },
  { id: 't100', budgetId: 'b1', percentage: 100, isAutomatic: true },
];
const evaluate = (
  spentMinor: number,
  sent: string[] = [],
  overrides: { availableMinor?: number; notifies?: boolean } = {},
) =>
  evaluateThresholds({
    spentMinor,
    availableMinor: overrides.availableMinor ?? 5500,
    notifies: overrides.notifies ?? true,
    thresholds,
    sentThresholdIds: new Set(sent),
  });

describe('RN-26 to RN-30 evaluation (the example table)', () => {
  it('USD 30 (54.5%) -> alert of 50%', () => {
    expect(evaluate(3000)).toEqual({
      toRecord: ['t50'],
      toClear: [],
      alertThreshold: thresholds[0],
    });
  });

  it('USD 50 (90.9%) -> alert of 90%, and the 50% is not repeated', () => {
    expect(evaluate(5000, ['t50'])).toEqual({
      toRecord: ['t90'],
      toClear: [],
      alertThreshold: thresholds[1],
    });
  });

  it('USD 56 (101.8%) -> automatic alert of 100%', () => {
    expect(evaluate(5600, ['t50', 't90'])).toEqual({
      toRecord: ['t100'],
      toClear: [],
      alertThreshold: thresholds[2],
    });
  });

  it('RN-29 USD 70 (127.3%) -> no alert, it is only shown as exceeded', () => {
    expect(evaluate(7000, ['t50', 't90', 't100'])).toEqual({
      toRecord: [],
      toClear: [],
      alertThreshold: null,
    });
  });

  it('RN-27 below every threshold nothing happens', () => {
    expect(evaluate(2000)).toEqual({ toRecord: [], toClear: [], alertThreshold: null });
  });

  it('RN-27 a threshold already sent is not sent again while the usage stays above it', () => {
    expect(evaluate(3100, ['t50'])).toEqual({ toRecord: [], toClear: [], alertThreshold: null });
  });

  it('RN-28 one change crossing several thresholds records all and notifies only the highest', () => {
    const decision = evaluate(5000); // from nothing to 90.9%

    expect(decision.toRecord).toEqual(['t50', 't90']);
    expect(decision.alertThreshold?.percentage).toBe(90);
  });

  it('RN-28 jumping straight past the 100% records all three and notifies the 100%', () => {
    const decision = evaluate(7000);

    expect(decision.toRecord).toEqual(['t50', 't90', 't100']);
    expect(decision.alertThreshold?.percentage).toBe(100);
  });

  it('RN-27 when the usage falls under a threshold, its record is cleared so it can notify again', () => {
    // A refund brings 5600 down to 2000 (36%): everything sent is cleared.
    expect(evaluate(2000, ['t50', 't90', 't100'])).toEqual({
      toRecord: [],
      toClear: ['t50', 't90', 't100'],
      alertThreshold: null,
    });
    // ...and it only clears what it fell under.
    expect(evaluate(3000, ['t50', 't90', 't100']).toClear).toEqual(['t90', 't100']);
  });

  it('RN-27 a threshold cleared by a refund notifies again when crossed again', () => {
    const afterRefund = evaluate(2000, ['t50']);
    expect(afterRefund.toClear).toEqual(['t50']);

    expect(evaluate(3000, []).alertThreshold?.percentage).toBe(50); // records were cleared
  });

  it('RN-27 more money available (an income or a higher amount) lowers the usage and clears records', () => {
    // 3000 spent was 54.5% of 5500 (50% sent); with 11000 available it is 27%.
    expect(evaluate(3000, ['t50'], { availableMinor: 11000 }).toClear).toEqual(['t50']);
  });

  it('exactly at a threshold counts as reached', () => {
    expect(evaluate(2750).alertThreshold?.percentage).toBe(50);
    expect(evaluate(5500, ['t50', 't90']).alertThreshold?.percentage).toBe(100);
  });

  it('RN-30 closed and deleted budgets do not notify and keep their records', () => {
    expect(evaluate(7000, [], { notifies: false })).toEqual({
      toRecord: [],
      toClear: [],
      alertThreshold: null,
    });
    expect(evaluate(100, ['t50'], { notifies: false })).toEqual({
      toRecord: [],
      toClear: [],
      alertThreshold: null,
    });
  });

  it('with no thresholds nothing is evaluated', () => {
    const decision = evaluateThresholds({
      spentMinor: 9999,
      availableMinor: 5500,
      notifies: true,
      thresholds: [],
      sentThresholdIds: new Set(),
    });

    expect(decision).toEqual({ toRecord: [], toClear: [], alertThreshold: null });
  });
});
