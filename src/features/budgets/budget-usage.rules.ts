import type { CurrencyCode } from '@/core/shared/currency';

import type { Budget, BudgetPhase, BudgetUsage, UsageState, UsageTotals } from './budget.types';

// Usage of a budget from what its assigned lines add up to (section "Cálculo de uso"):
//   spent      = expenses - refunds   (RN-22, never below 0)
//   available  = amount + incomes     (RN-23)
//   percentage = spent / available * 100
//   remaining  = available - spent    (negative = exceeded)
export function calculateUsage(amountMinor: number, totals: UsageTotals): BudgetUsage {
  const spentMinor = Math.max(0, totals.expenseMinor - totals.refundMinor);
  const availableMinor = amountMinor + totals.incomeMinor;

  return {
    spentMinor,
    availableMinor,
    remainingMinor: availableMinor - spentMinor,
    percentage: availableMinor > 0 ? (spentMinor / availableMinor) * 100 : 0,
  };
}

// RN-05: a closed budget shows the spent amount frozen when it closed. Everything else
// is calculated from the movements as they are now.
export function calculateBudgetUsage(budget: Budget, totals: UsageTotals): BudgetUsage {
  const live = calculateUsage(budget.amountMinor, totals);
  if (budget.status !== 'CLOSED' || budget.spentFinalMinor === null) return live;

  const remainingMinor = live.availableMinor - budget.spentFinalMinor;
  return {
    ...live,
    spentMinor: budget.spentFinalMinor,
    remainingMinor,
    percentage: live.availableMinor > 0 ? (budget.spentFinalMinor / live.availableMinor) * 100 : 0,
  };
}

// RN-29: over 100% the budget is marked "exceeded" (and it is allowed, RN-11).
// RN-09: a closed budget with money left shows it as "saved".
export function getUsageState(usage: BudgetUsage, phase: BudgetPhase): UsageState {
  if (usage.remainingMinor < 0) return 'EXCEEDED';
  if (phase === 'CLOSED' && usage.remainingMinor > 0) return 'SAVED';

  return 'NORMAL';
}

// How much of the bar to fill: from 0 to 100, even when the usage passes 100%.
export function barFillPercentage(usage: BudgetUsage): number {
  return Math.min(100, Math.max(0, usage.percentage));
}

export type CurrencyUsageSummary = {
  currency: CurrencyCode;
  availableMinor: number;
  spentMinor: number;
  remainingMinor: number;
};

type SummaryItem = { currency: CurrencyCode; phase: BudgetPhase; usage: BudgetUsage };

// RN-33: totals per currency, never added across currencies. Only budgets still open (active or
// in grace) count: a closed one is history, not money left to spend.
export function summarizeOpenBudgets(items: readonly SummaryItem[]): CurrencyUsageSummary[] {
  const summaries = new Map<CurrencyCode, CurrencyUsageSummary>();
  for (const item of items) {
    if (item.phase === 'CLOSED') continue;
    const entry = summaries.get(item.currency) ?? {
      currency: item.currency,
      availableMinor: 0,
      spentMinor: 0,
      remainingMinor: 0,
    };
    entry.availableMinor += item.usage.availableMinor;
    entry.spentMinor += item.usage.spentMinor;
    entry.remainingMinor += item.usage.remainingMinor;
    summaries.set(item.currency, entry);
  }

  return [...summaries.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
