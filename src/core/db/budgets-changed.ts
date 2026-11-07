// Called after a change that may have moved the usage of some budgets (RN-26, RN-39), with their
// ids. The composition root uses it to evaluate alert thresholds. It runs after the change is
// saved; if it fails, the saved change stays (the alert is the lesser loss).
export type BudgetsChangedListener = (budgetIds: readonly string[]) => Promise<void>;

export const ignoreBudgetsChanged: BudgetsChangedListener = () => Promise.resolve();

// Calls the listener only when there is something to evaluate, and never lets it break the caller.
export async function notifyBudgetsChanged(
  listener: BudgetsChangedListener,
  budgetIds: readonly (string | null)[],
): Promise<void> {
  const ids = [...new Set(budgetIds.filter((id): id is string => id !== null))];
  if (ids.length === 0) return;
  try {
    await listener(ids);
  } catch {
    // The change is already saved; a failed alert must not turn it into an error.
  }
}
