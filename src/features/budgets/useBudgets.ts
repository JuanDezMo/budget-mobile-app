import { useEffect, useState } from 'react';

import { todayLocalDate } from '@/core/shared/dates';
import type { LocalDate } from '@/core/shared/dates';

import { calculateBudgetUsage, getUsageState, summarizeOpenBudgets } from './budget-usage.rules';
import type { BudgetRepository } from './budget.repository';
import { getBudgetPhase, shouldCloseBudget } from './budget.rules';
import { ZERO_USAGE_TOTALS } from './budget.types';
import type { Budget, BudgetItem, BudgetPhase, UsageTotals } from './budget.types';
import { useBudgetRepository } from './useBudgetRepository';

// RN-05: runs when the app opens (no background jobs). Every ACTIVE budget past its grace
// period becomes CLOSED and keeps the amount spent at that moment. Returns how many closed.
export async function closeExpiredBudgets(
  repository: BudgetRepository,
  today: LocalDate = todayLocalDate(),
): Promise<number> {
  let closed = 0;
  for (const budget of await repository.list({ status: 'ACTIVE' })) {
    if (!shouldCloseBudget(budget, today)) continue;

    await repository.close(budget.id, await repository.getSpentMinor(budget.id));
    closed += 1;
  }

  return closed;
}

type Loaded = { budgets: Budget[]; totals: Record<string, UsageTotals> };

// Budgets grouped by what the user sees (active, in grace, closed; RN-05, RN-38), each with its
// usage (RN-22, RN-23, RN-29, RN-09) and the overall summary per currency (RN-33).
// `refreshKey` changes when the screen regains focus, to load again.
export function useBudgets(refreshKey = 0) {
  const repository = useBudgetRepository();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [today] = useState(() => todayLocalDate());

  useEffect(() => {
    let active = true;
    // Two queries for the whole list, not one per budget.
    void Promise.all([repository.list(), repository.listUsageTotals()]).then(
      ([budgets, totals]) => {
        if (active) setLoaded({ budgets, totals });
      },
    );

    return () => {
      active = false;
    };
  }, [repository, refreshKey]);

  const items: BudgetItem[] = (loaded?.budgets ?? []).map((budget) => {
    const phase = getBudgetPhase(budget, today);
    const usage = calculateBudgetUsage(budget, loaded?.totals[budget.id] ?? ZERO_USAGE_TOTALS);

    return { budget, phase, usage, state: getUsageState(usage, phase) };
  });
  const inPhase = (phase: BudgetPhase) => items.filter((item) => item.phase === phase);

  return {
    isLoading: loaded === null,
    today,
    active: inPhase('ACTIVE'),
    grace: inPhase('GRACE'),
    closed: inPhase('CLOSED'),
    summary: summarizeOpenBudgets(
      items.map((item) => ({
        currency: item.budget.currency,
        phase: item.phase,
        usage: item.usage,
      })),
    ),
  };
}
