import type { CurrencyCode } from '@/core/shared/currency';
import type { LocalDate } from '@/core/shared/dates';

import type { Budget } from '../budgets/budget.types';

// RN-12: the kind is set once on the header; a movement never mixes kinds.
export const MOVEMENT_KINDS = ['EXPENSE', 'REFUND', 'INCOME'] as const;
export type MovementKind = (typeof MOVEMENT_KINDS)[number];

// RN-19: the payment method is required and has fixed values.
export const PAYMENT_METHODS = ['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'TRANSFER', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// A part of a movement assigned to one category (RN-14). `budgetId` is set by the app, never
// by the user (RN-17); null means "no budget".
export type MovementLine = {
  id: string;
  categoryId: string;
  budgetId: string | null;
  amountMinor: number;
};

export type Movement = {
  id: string;
  kind: MovementKind;
  currency: CurrencyCode;
  totalMinor: number;
  occurredAt: string; // local date and time with UTC offset (RN-15)
  localDate: LocalDate;
  paymentMethod: PaymentMethod;
  note: string | null;
  lines: MovementLine[];
  deletedAt: string | null; // logical delete (RN-21)
};

export type NewMovementLine = { categoryId: string; amountMinor: number };

export type NewMovement = {
  kind: MovementKind;
  currency: CurrencyCode;
  totalMinor: number;
  occurredAt: string;
  paymentMethod: PaymentMethod;
  note: string | null;
  lines: NewMovementLine[];
};

// The history loads this many movements at a time, so a long history stays light.
export const MOVEMENT_PAGE_SIZE = 20;

export type MovementPage = { limit: number; offset: number };

// RN-33: one row per currency; currencies are never added together.
export type CurrencyTotals = {
  currency: CurrencyCode;
  expense: number;
  refund: number;
  income: number;
};

export type MovementFilter = {
  kind?: MovementKind;
  currency?: CurrencyCode;
};

// The part of a budget needed to decide where a line counts (RN-17).
export type AssignableBudget = Pick<
  Budget,
  'id' | 'categoryId' | 'currency' | 'startDate' | 'endDate' | 'status' | 'deletedAt'
>;

export type LineForAssignment = {
  categoryId: string;
  currency: CurrencyCode;
  localDate: LocalDate;
};

// The pure rules a repository needs to assign budgets inside its own transaction (RN-17, RN-39).
// A repository may not import rules, so the composition root hands them in.
export interface BudgetAssignmentRules {
  // Id of the budget the line counts for, or null.
  pickBudgetId(
    line: LineForAssignment,
    budgets: readonly AssignableBudget[],
    today: LocalDate,
  ): string | null;
  // A line that counts in a closed budget is frozen: reassigning must leave it alone (RN-08).
  isFrozen(current: AssignableBudget | undefined, today: LocalDate): boolean;
}

// What a budget holds, to tell the user what an income does to it (sketch 4): its amount and what
// its lines add up to.
export type BudgetUsageSnapshot = {
  amountMinor: number;
  expenseMinor: number;
  refundMinor: number;
  incomeMinor: number;
};
