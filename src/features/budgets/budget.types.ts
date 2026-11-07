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
