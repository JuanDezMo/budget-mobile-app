import { evaluateThresholds } from './alert.rules';
import type { ThresholdRepository } from './alert.repository';
import type { BudgetAlert, BudgetSnapshot } from './alert.types';

// What the evaluator needs from the rest of the app. The composition root provides them.
export type AlertDependencies = {
  thresholds: ThresholdRepository;
  // Usage and state of the given budgets, now.
  loadSnapshots(budgetIds: readonly string[]): Promise<BudgetSnapshot[]>;
  // Delivers one alert (system notification, or in-app banner without permission, RN-31).
  notify(alert: BudgetAlert): Promise<void>;
  now?: () => Date;
};

// RN-26: looks again at the given budgets after something changed their usage (a movement was
// created, edited or deleted; a budget's amount or dates changed; lines were reassigned, RN-39).
// There is no background process: it only runs when one of those things happens.
// With `notify: false` the thresholds are brought up to date without telling the user (used when
// the user just changed the thresholds themselves).
export async function evaluateBudgetAlerts(
  deps: AlertDependencies,
  budgetIds: readonly string[],
  options: { notify?: boolean } = {},
): Promise<void> {
  const unique = [...new Set(budgetIds)];
  if (unique.length === 0) return;
  const sendAlerts = options.notify ?? true;
  const now = deps.now ?? (() => new Date());

  for (const snapshot of await deps.loadSnapshots(unique)) {
    // RN-30: closed and deleted budgets do not notify.
    if (!snapshot.notifies) continue;

    await deps.thresholds.ensureAutomatic(snapshot.budgetId); // RN-25
    const thresholds = await deps.thresholds.list(snapshot.budgetId);
    const decision = evaluateThresholds({
      spentMinor: snapshot.spentMinor,
      availableMinor: snapshot.availableMinor,
      notifies: snapshot.notifies,
      thresholds,
      sentThresholdIds: await deps.thresholds.listSentIds(snapshot.budgetId),
    });

    await deps.thresholds.clearSent(decision.toClear); // RN-27
    await deps.thresholds.recordSent(decision.toRecord, now().toISOString());
    if (sendAlerts && decision.alertThreshold) {
      await deps.notify({
        budgetId: snapshot.budgetId,
        categoryLabel: snapshot.categoryLabel,
        currency: snapshot.currency,
        threshold: decision.alertThreshold.percentage,
        spentMinor: snapshot.spentMinor,
        availableMinor: snapshot.availableMinor,
      }); // RN-28: one notification, the highest threshold
    }
  }
}
