import type { CurrencyCode } from '@/core/shared/currency';

// RN-24: up to 3 thresholds chosen by the user, plus the automatic 100% (RN-25).
export const MAX_CONFIGURABLE_THRESHOLDS = 3;
export const AUTOMATIC_THRESHOLD_PERCENTAGE = 100;

export type Threshold = {
  id: string;
  budgetId: string;
  percentage: number; // 1 to 100
  isAutomatic: boolean; // true only for the 100% that always exists
};

// A budget as the evaluator sees it. The composition root builds it from the budget data, so this
// feature does not need to know how usage or phases are worked out.
export type BudgetSnapshot = {
  budgetId: string;
  categoryLabel: string;
  currency: CurrencyCode;
  spentMinor: number;
  availableMinor: number;
  // RN-30: only active and in-grace budgets notify; closed and deleted ones do not.
  notifies: boolean;
};

// What is sent to the user: the highest threshold crossed by one change (RN-28).
export type BudgetAlert = {
  budgetId: string;
  categoryLabel: string;
  currency: CurrencyCode;
  threshold: number;
  spentMinor: number;
  availableMinor: number;
};

// What to do after looking at one budget.
export type EvaluationDecision = {
  toRecord: string[]; // thresholds just crossed: register them as sent (RN-27)
  toClear: string[]; // thresholds the usage fell below: they can notify again (RN-27)
  alertThreshold: Threshold | null; // the one to notify, the highest of the new ones (RN-28)
};
