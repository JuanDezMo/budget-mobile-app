import { useCallback, useEffect, useState } from 'react';

import { todayLocalDate } from '@/core/shared/dates';
import { err, ok } from '@/core/shared/result';
import type { Result } from '@/core/shared/result';

import { calculateBudgetUsage, getUsageState } from './budget-usage.rules';
import { checkCanEditBudget, getBudgetPhase } from './budget.rules';
import { BUDGET_LINES_PAGE_SIZE, ZERO_USAGE_TOTALS } from './budget.types';
import type { Budget, BudgetLine, UsageTotals } from './budget.types';
import { useBudgetRepository } from './useBudgetRepository';

// One budget with its phase, its usage and the lines counting for it (RN-17, RN-22, RN-23),
// and the delete action (RN-10). Lines load one page at a time.
export function useBudgetDetail(budgetId: string, refreshKey = 0) {
  const repository = useBudgetRepository();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [totals, setTotals] = useState<UsageTotals>(ZERO_USAGE_TOTALS);
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [hasMoreLines, setHasMoreLines] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [today] = useState(() => todayLocalDate());

  useEffect(() => {
    let active = true;
    void Promise.all([
      repository.get(budgetId),
      repository.listUsageTotals(),
      // One extra line tells whether another page exists.
      repository.listLines(budgetId, { limit: BUDGET_LINES_PAGE_SIZE + 1, offset: 0 }),
    ]).then(([found, allTotals, firstLines]) => {
      if (!active) return;
      setBudget(found && found.deletedAt === null ? found : null);
      setTotals(allTotals[budgetId] ?? ZERO_USAGE_TOTALS);
      setLines(firstLines.slice(0, BUDGET_LINES_PAGE_SIZE));
      setHasMoreLines(firstLines.length > BUDGET_LINES_PAGE_SIZE);
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [repository, budgetId, refreshKey]);

  const loadMoreLines = useCallback(async () => {
    if (!hasMoreLines || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const next = await repository.listLines(budgetId, {
        limit: BUDGET_LINES_PAGE_SIZE + 1,
        offset: lines.length,
      });
      setLines([...lines, ...next.slice(0, BUDGET_LINES_PAGE_SIZE)]);
      setHasMoreLines(next.length > BUDGET_LINES_PAGE_SIZE);
    } finally {
      setIsLoadingMore(false);
    }
  }, [repository, budgetId, lines, hasMoreLines, isLoadingMore]);

  // RN-10: logical delete, allowed in any phase.
  async function remove(): Promise<Result<void, 'UNEXPECTED'>> {
    try {
      await repository.softDelete(budgetId);
      return ok(undefined);
    } catch {
      return err('UNEXPECTED');
    }
  }

  const phase = budget ? getBudgetPhase(budget, today) : null;
  const usage = budget ? calculateBudgetUsage(budget, totals) : null;

  return {
    isLoading,
    budget,
    phase,
    usage,
    state: usage && phase ? getUsageState(usage, phase) : null,
    lines,
    hasMoreLines,
    isLoadingMore,
    loadMoreLines,
    canEdit: budget ? checkCanEditBudget(budget, today).ok : false,
    remove,
  };
}
