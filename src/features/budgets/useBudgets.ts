import { useEffect, useState } from 'react';

import { todayLocalDate } from '@/core/shared/dates';
import type { LocalDate } from '@/core/shared/dates';

import type { BudgetRepository } from './budget.repository';
import { getBudgetPhase, shouldCloseBudget } from './budget.rules';
import type { Budget } from './budget.types';
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

// Budgets grouped by what the user sees: active, in grace and closed (RN-05, RN-38).
export function useBudgets(refreshKey = 0) {
  const repository = useBudgetRepository();
  const [budgets, setBudgets] = useState<Budget[] | null>(null);
  const [today] = useState(() => todayLocalDate());

  useEffect(() => {
    let active = true;
    void repository.list().then((list) => {
      if (active) setBudgets(list);
    });

    return () => {
      active = false;
    };
  }, [repository, refreshKey]);

  const list = budgets ?? [];
  const inPhase = (phase: 'ACTIVE' | 'GRACE' | 'CLOSED') =>
    list.filter((budget) => getBudgetPhase(budget, today) === phase);

  return {
    isLoading: budgets === null,
    today,
    active: inPhase('ACTIVE'),
    grace: inPhase('GRACE'),
    closed: inPhase('CLOSED'),
  };
}
