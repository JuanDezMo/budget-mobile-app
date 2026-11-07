import type { BudgetsChangedListener } from '@/core/db/budgets-changed';
import { translate } from '@/core/i18n/i18n';
import { buildBudgetAlertMessage } from '@/core/notifications/messages';
import type { NotificationMessage } from '@/core/notifications/notifier';
import { todayLocalDate } from '@/core/shared/dates';
import type { ThresholdRepository } from '@/features/alerts/alert.repository';
import type { BudgetAlert, BudgetSnapshot } from '@/features/alerts/alert.types';
import { evaluateBudgetAlerts } from '@/features/alerts/useAlerts';
import { calculateBudgetUsage } from '@/features/budgets/budget-usage.rules';
import type { BudgetRepository } from '@/features/budgets/budget.repository';
import { getBudgetPhase } from '@/features/budgets/budget.rules';
import { ZERO_USAGE_TOTALS } from '@/features/budgets/budget.types';
import { getCategoryLabel } from '@/features/categories/category.rules';
import type { CategoryRepository } from '@/features/categories/category.repository';

type Dependencies = {
  budgets: BudgetRepository;
  categories: CategoryRepository;
  thresholds: ThresholdRepository;
  // Delivers the message: system notification, or in-app banner without permission (RN-31).
  deliver: (message: NotificationMessage) => Promise<unknown>;
  today?: () => string;
};

// The one place that knows both the budgets and the alerts. It turns a list of changed budget ids
// (RN-26, RN-39) into evaluated thresholds and, when a threshold is crossed, a delivered alert.
export function createAlertWiring(deps: Dependencies) {
  const today = deps.today ?? todayLocalDate;

  async function loadSnapshots(budgetIds: readonly string[]): Promise<BudgetSnapshot[]> {
    const [budgets, totals, categories] = await Promise.all([
      deps.budgets.list({ includeDeleted: true }),
      deps.budgets.listUsageTotals(),
      deps.categories.list(),
    ]);

    return budgets
      .filter((budget) => budgetIds.includes(budget.id))
      .map((budget) => {
        const usage = calculateBudgetUsage(budget, totals[budget.id] ?? ZERO_USAGE_TOTALS);
        const category = categories.find((candidate) => candidate.id === budget.categoryId);

        return {
          budgetId: budget.id,
          categoryLabel: category ? getCategoryLabel(category, translate) : '',
          currency: budget.currency,
          spentMinor: usage.spentMinor,
          availableMinor: usage.availableMinor,
          // RN-30: active and in grace notify; closed and deleted budgets do not.
          notifies: budget.deletedAt === null && getBudgetPhase(budget, today()) !== 'CLOSED',
        };
      });
  }

  const dependencies = {
    thresholds: deps.thresholds,
    loadSnapshots,
    notify: (alert: BudgetAlert) =>
      deps.deliver(buildBudgetAlertMessage(alert)).then(() => undefined),
  };

  return {
    // For the repositories (RN-26): evaluates and notifies.
    onBudgetsChanged: ((budgetIds) =>
      evaluateBudgetAlerts(dependencies, budgetIds)) satisfies BudgetsChangedListener,
    // After the user edits the thresholds of a budget: brings records up to date, without notifying.
    syncAfterThresholdEdit: (budgetId: string) =>
      evaluateBudgetAlerts(dependencies, [budgetId], { notify: false }),
  };
}
