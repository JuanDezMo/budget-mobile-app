import { useEffect, useState } from 'react';

import { todayLocalDate } from '@/core/shared/dates';
import { err, ok } from '@/core/shared/result';
import type { Result } from '@/core/shared/result';

import { checkCanEditBudget, getBudgetPhase } from './budget.rules';
import type { Budget } from './budget.types';
import { useBudgetRepository } from './useBudgetRepository';

// One budget with its phase, and the delete action (RN-10).
export function useBudgetDetail(budgetId: string) {
  const repository = useBudgetRepository();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [today] = useState(() => todayLocalDate());

  useEffect(() => {
    let active = true;
    void repository.get(budgetId).then((found) => {
      if (!active) return;
      setBudget(found && found.deletedAt === null ? found : null);
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [repository, budgetId]);

  // RN-10: logical delete, allowed in any phase.
  async function remove(): Promise<Result<void, 'UNEXPECTED'>> {
    try {
      await repository.softDelete(budgetId);
      return ok(undefined);
    } catch {
      return err('UNEXPECTED');
    }
  }

  return {
    isLoading,
    budget,
    phase: budget ? getBudgetPhase(budget, today) : null,
    canEdit: budget ? checkCanEditBudget(budget, today).ok : false,
    remove,
  };
}
