import { addDaysToLocalDate, compareLocalDates, rangesOverlap } from '@/core/shared/dates';
import type { LocalDate } from '@/core/shared/dates';
import type { CurrencyCode } from '@/core/shared/currency';
import { err, ok } from '@/core/shared/result';
import type { Result } from '@/core/shared/result';

import { checkCanHaveBudget } from '../categories/category.rules';
import type { Category } from '../categories/category.types';
import type { Budget, BudgetPhase, NewBudget } from './budget.types';

// RN-38: the grace period is 5 days for every budget and cannot be changed.
export const GRACE_DAYS = 5;

// RN-05: ACTIVE while today <= end; in GRACE while end < today <= end + 5; CLOSED after that.
// A budget already stored as CLOSED stays closed.
export function getBudgetPhase(
  budget: Pick<Budget, 'status' | 'endDate'>,
  today: LocalDate,
): BudgetPhase {
  if (budget.status === 'CLOSED') return 'CLOSED';
  if (compareLocalDates(today, budget.endDate) <= 0) return 'ACTIVE';

  const lastGraceDay = addDaysToLocalDate(budget.endDate, GRACE_DAYS);
  return compareLocalDates(today, lastGraceDay) <= 0 ? 'GRACE' : 'CLOSED';
}

// RN-05: the close is applied when the app opens, to budgets still stored as ACTIVE.
export function shouldCloseBudget(budget: Budget, today: LocalDate): boolean {
  return (
    budget.deletedAt === null &&
    budget.status === 'ACTIVE' &&
    getBudgetPhase(budget, today) === 'CLOSED'
  );
}

export type BudgetDataError =
  | 'BUDGET_AMOUNT_INVALID'
  | 'BUDGET_DATES_INVALID'
  | 'CATEGORY_ARCHIVED'
  | 'CATEGORY_NO_BUDGET_ALLOWED';

// RN-01 (+ RN-36, RN-40): category that can have a budget, amount > 0 and start <= end.
export function checkNewBudgetData(
  data: NewBudget,
  category: Category,
): Result<NewBudget, BudgetDataError> {
  const allowed = checkCanHaveBudget(category);
  if (!allowed.ok) return allowed;
  if (!Number.isSafeInteger(data.amountMinor) || data.amountMinor <= 0) {
    return err('BUDGET_AMOUNT_INVALID');
  }
  if (compareLocalDates(data.startDate, data.endDate) > 0) return err('BUDGET_DATES_INVALID');

  return ok(data);
}

// RN-03: no two live budgets of the same category may overlap, whatever their currency.
// `ignoreId` is the budget being edited, so it does not collide with itself.
export function checkNoOverlap(
  candidate: { categoryId: string; startDate: LocalDate; endDate: LocalDate },
  existing: readonly Budget[],
  ignoreId?: string,
): Result<void, 'BUDGET_OVERLAP'> {
  const clash = existing.some(
    (budget) =>
      budget.deletedAt === null &&
      budget.id !== ignoreId &&
      budget.categoryId === candidate.categoryId &&
      rangesOverlap(
        { start: candidate.startDate, end: candidate.endDate },
        { start: budget.startDate, end: budget.endDate },
      ),
  );

  return clash ? err('BUDGET_OVERLAP') : ok(undefined);
}

// RN-02: the currency is chosen when the budget is created and never changes.
export function checkCurrencyUnchanged(
  budget: Budget,
  requested: CurrencyCode,
): Result<void, 'BUDGET_CURRENCY_LOCKED'> {
  return requested === budget.currency ? ok(undefined) : err('BUDGET_CURRENCY_LOCKED');
}

// RN-06, RN-07, RN-08: amount and dates can only be edited while the budget is ACTIVE.
// In grace or closed it is read-only.
export function checkCanEditBudget(
  budget: Budget,
  today: LocalDate,
): Result<void, 'BUDGET_NOT_EDITABLE'> {
  if (budget.deletedAt !== null) return err('BUDGET_NOT_EDITABLE');
  return getBudgetPhase(budget, today) === 'ACTIVE' ? ok(undefined) : err('BUDGET_NOT_EDITABLE');
}

// RN-06: lowering the amount under what is already spent is allowed, but the user is warned.
export function isAmountBelowSpent(newAmountMinor: number, spentMinor: number): boolean {
  return newAmountMinor < spentMinor;
}
