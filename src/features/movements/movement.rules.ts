import { CURRENCY_DECIMALS } from '@/core/shared/currency';
import type { CurrencyCode } from '@/core/shared/currency';
import { MAX_INTEGER_DIGITS } from '@/core/shared/amount';
import { isDateInRange, isValidOccurredAt, localDateOf } from '@/core/shared/dates';
import type { LocalDate } from '@/core/shared/dates';
import { err, ok } from '@/core/shared/result';
import type { Result } from '@/core/shared/result';

import { calculateUsage } from '../budgets/budget-usage.rules';
import { getBudgetPhase } from '../budgets/budget.rules';
import { checkCanReceiveLines } from '../categories/category.rules';
import type { Category } from '../categories/category.types';
import { MOVEMENT_KINDS, PAYMENT_METHODS } from './movement.types';
import type {
  AssignableBudget,
  BudgetAssignmentRules,
  BudgetUsageSnapshot,
  CurrencyTotals,
  LineForAssignment,
  Movement,
  NewMovement,
} from './movement.types';

export type MovementError =
  | 'MOVEMENT_KIND_INVALID'
  | 'PAYMENT_METHOD_REQUIRED'
  | 'MOVEMENT_TOTAL_INVALID'
  | 'MOVEMENT_NO_LINES'
  | 'MOVEMENT_LINE_AMOUNT_INVALID'
  | 'MOVEMENT_LINE_CATEGORY_INVALID'
  | 'MOVEMENT_TOTAL_MISMATCH'
  | 'MOVEMENT_DATE_INVALID'
  | 'MOVEMENT_FUTURE_DATE'
  | 'AMOUNT_TOO_LARGE'
  | 'CATEGORY_ARCHIVED';

// RN-20: at most 12 integer digits, so the largest amount in the minor unit depends on the currency.
export function maxAmountMinor(currency: CurrencyCode): number {
  return 10 ** (MAX_INTEGER_DIGITS + CURRENCY_DECIMALS[currency]) - 1;
}

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

// RN-12 to RN-16, RN-19, RN-20 and RN-36: everything that makes a movement valid before saving.
// `now` is the device clock (RN-16); `categories` are all the known categories.
export function validateMovement(
  movement: NewMovement,
  now: Date,
  categories: readonly Category[],
): Result<NewMovement, MovementError> {
  if (!MOVEMENT_KINDS.some((kind) => kind === movement.kind)) return err('MOVEMENT_KIND_INVALID');
  if (!PAYMENT_METHODS.some((method) => method === movement.paymentMethod)) {
    return err('PAYMENT_METHOD_REQUIRED');
  }

  const max = maxAmountMinor(movement.currency);
  if (!isPositiveInteger(movement.totalMinor)) return err('MOVEMENT_TOTAL_INVALID');
  if (movement.totalMinor > max) return err('AMOUNT_TOO_LARGE');

  if (movement.lines.length === 0) return err('MOVEMENT_NO_LINES');
  for (const line of movement.lines) {
    if (!isPositiveInteger(line.amountMinor)) return err('MOVEMENT_LINE_AMOUNT_INVALID');
    if (line.amountMinor > max) return err('AMOUNT_TOO_LARGE');

    const category = categories.find((candidate) => candidate.id === line.categoryId);
    if (!category) return err('MOVEMENT_LINE_CATEGORY_INVALID');
    const usable = checkCanReceiveLines(category);
    if (!usable.ok) return usable;
  }

  const sum = movement.lines.reduce((total, line) => total + line.amountMinor, 0);
  if (sum !== movement.totalMinor) return err('MOVEMENT_TOTAL_MISMATCH');

  if (!isValidOccurredAt(movement.occurredAt)) return err('MOVEMENT_DATE_INVALID');
  if (new Date(movement.occurredAt).getTime() > now.getTime()) return err('MOVEMENT_FUTURE_DATE');

  return ok(movement);
}

// What is still to be shared out among the lines (negative = the lines add up to more).
export function remainingMinor(totalMinor: number, lineAmountsMinor: readonly number[]): number {
  return totalMinor - lineAmountsMinor.reduce((sum, amount) => sum + amount, 0);
}

// RN-17: the budget a line counts for: same category, same currency as the movement, local date
// inside [start, end], not deleted, and active or in grace today. By RN-03 there is at most one.
export function pickBudgetIdForLine(
  line: LineForAssignment,
  budgets: readonly AssignableBudget[],
  today: LocalDate,
): string | null {
  const match = budgets.find(
    (budget) =>
      budget.deletedAt === null &&
      budget.categoryId === line.categoryId &&
      budget.currency === line.currency &&
      isDateInRange(line.localDate, budget.startDate, budget.endDate) &&
      getBudgetPhase(budget, today) !== 'CLOSED',
  );

  return match?.id ?? null;
}

// RN-08 / RN-18: a line that counts in a closed budget cannot change. A deleted budget no longer
// counts (RN-10), so its lines are free to be reassigned.
export function isBudgetFrozen(current: AssignableBudget | undefined, today: LocalDate): boolean {
  return (
    current !== undefined &&
    current.deletedAt === null &&
    getBudgetPhase(current, today) === 'CLOSED'
  );
}

export const budgetAssignmentRules: BudgetAssignmentRules = {
  pickBudgetId: pickBudgetIdForLine,
  isFrozen: isBudgetFrozen,
};

export type LineAssignment =
  | { kind: 'BUDGET'; budget: AssignableBudget } // "Counts for: ..."
  | { kind: 'NONE' } // RN-41: no active budget, the line is kept without one
  | { kind: 'CLOSED_BUDGET'; budget: AssignableBudget }; // RN-18: the date falls in a closed budget

// What the form shows for each line before saving (RN-17, RN-18, RN-41).
export function describeLineAssignment(
  line: LineForAssignment,
  budgets: readonly AssignableBudget[],
  today: LocalDate,
): LineAssignment {
  const id = pickBudgetIdForLine(line, budgets, today);
  const chosen = budgets.find((budget) => budget.id === id);
  if (chosen) return { kind: 'BUDGET', budget: chosen };

  const closed = budgets.find(
    (budget) =>
      budget.deletedAt === null &&
      budget.categoryId === line.categoryId &&
      budget.currency === line.currency &&
      isDateInRange(line.localDate, budget.startDate, budget.endDate) &&
      getBudgetPhase(budget, today) === 'CLOSED',
  );

  return closed ? { kind: 'CLOSED_BUDGET', budget: closed } : { kind: 'NONE' };
}

// RN-08 / RN-18: a movement with a line counting in a closed budget cannot be edited or deleted.
export function checkMovementEditable(
  movement: Movement,
  budgets: readonly AssignableBudget[],
  today: LocalDate,
): Result<void, 'MOVEMENT_LOCKED'> {
  const locked = movement.lines.some((line) =>
    isBudgetFrozen(
      budgets.find((budget) => budget.id === line.budgetId),
      today,
    ),
  );

  return locked ? err('MOVEMENT_LOCKED') : ok(undefined);
}

// RN-33: totals are kept per currency and never added across currencies.
export function summarizeByCurrency(movements: readonly Movement[]): CurrencyTotals[] {
  const totals = new Map<CurrencyCode, CurrencyTotals>();
  for (const movement of movements) {
    if (movement.deletedAt !== null) continue;
    const entry = totals.get(movement.currency) ?? {
      currency: movement.currency,
      expense: 0,
      refund: 0,
      income: 0,
    };
    if (movement.kind === 'EXPENSE') entry.expense += movement.totalMinor;
    else if (movement.kind === 'REFUND') entry.refund += movement.totalMinor;
    else entry.income += movement.totalMinor;
    totals.set(movement.currency, entry);
  }

  return [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

// Date of a movement as the history groups it (RN-15): the day written in `occurred_at`.
export function movementDay(occurredAt: string): LocalDate {
  return localDateOf(occurredAt);
}

export type IncomeImpact = {
  availableBeforeMinor: number; // what the budget can spend now
  availableAfterMinor: number; // ...with this income (RN-23)
  remainingAfterMinor: number; // what would be left to spend
};

// Sketch 4: "The envelope will go from US$55 to US$70. US$40 will be left." An income that counts
// for a budget raises its available amount (RN-23). When editing an income, its own previous
// amount is already inside the budget's totals, so `previousIncomeMinor` takes it out first.
export function describeIncomeImpact(
  incomeMinor: number,
  usage: BudgetUsageSnapshot,
  previousIncomeMinor = 0,
): IncomeImpact {
  const without = {
    expenseMinor: usage.expenseMinor,
    refundMinor: usage.refundMinor,
    incomeMinor: Math.max(0, usage.incomeMinor - previousIncomeMinor),
  };
  const before = calculateUsage(usage.amountMinor, without);
  const after = calculateUsage(usage.amountMinor, {
    ...without,
    incomeMinor: without.incomeMinor + incomeMinor,
  });

  return {
    availableBeforeMinor: before.availableMinor,
    availableAfterMinor: after.availableMinor,
    remainingAfterMinor: after.remainingMinor,
  };
}
