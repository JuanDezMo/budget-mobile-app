import type { CurrencyCode } from '@/core/shared/currency';
import type { LocalDate } from '@/core/shared/dates';

// What is saved (RN-05): only the close is stored. "In grace" is calculated from the dates.
export type BudgetStatus = 'ACTIVE' | 'CLOSED';

// What the user sees: ACTIVE until the end date, GRACE for 5 more days, then CLOSED.
export type BudgetPhase = 'ACTIVE' | 'GRACE' | 'CLOSED';

export type Budget = {
  id: string;
  categoryId: string;
  currency: CurrencyCode; // fixed once created (RN-02)
  amountMinor: number;
  startDate: LocalDate;
  endDate: LocalDate;
  status: BudgetStatus;
  spentFinalMinor: number | null; // frozen when it closes
  closedAt: string | null;
  deletedAt: string | null; // logical delete (RN-10)
};

export type NewBudget = {
  categoryId: string;
  currency: CurrencyCode;
  amountMinor: number;
  startDate: LocalDate;
  endDate: LocalDate;
};

// RN-06 / RN-07: only the amount and the dates can change.
export type BudgetUpdate = {
  amountMinor?: number;
  startDate?: LocalDate;
  endDate?: LocalDate;
};

export type BudgetFilter = {
  categoryId?: string;
  status?: BudgetStatus;
  includeDeleted?: boolean;
};

// What the movement lines assigned to a budget add up to, by kind (RN-22, RN-23).
export type UsageTotals = {
  expenseMinor: number;
  refundMinor: number;
  incomeMinor: number;
};

export const ZERO_USAGE_TOTALS: UsageTotals = { expenseMinor: 0, refundMinor: 0, incomeMinor: 0 };

// How much of a budget is used. All amounts are in the budget's currency, in the minor unit.
export type BudgetUsage = {
  spentMinor: number; // expenses - refunds, never below 0
  availableMinor: number; // budget amount + incomes
  remainingMinor: number; // available - spent; negative means exceeded
  percentage: number; // spent / available * 100 (can pass 100)
};

// How the screen presents the usage (RN-09, RN-29).
export type UsageState = 'NORMAL' | 'EXCEEDED' | 'SAVED';

// A movement line counting for a budget, with what is needed to show it in the detail.
export type BudgetLine = {
  lineId: string;
  movementId: string;
  kind: 'EXPENSE' | 'REFUND' | 'INCOME';
  localDate: LocalDate;
  note: string | null;
  categoryId: string;
  amountMinor: number;
};

export const BUDGET_LINES_PAGE_SIZE = 20;

// A budget as the screens list it: with its phase, its usage and how that usage is presented.
export type BudgetItem = {
  budget: Budget;
  phase: BudgetPhase;
  usage: BudgetUsage;
  state: UsageState;
};
