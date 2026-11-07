import type { LocalDate } from '@/core/shared/dates';

import type { AppDatabase } from './database.types';

// Which movement lines to look at again (RN-39): all lines of a category, or those of one
// movement. `today` decides which budgets are still open (active or in grace).
export type ReassignScope = {
  categoryId?: string;
  movementId?: string;
  today: LocalDate;
};

// Recalculates `budget_id` of the lines in scope, using the transaction it is given so the change
// and the budget write commit together (RN-39). Returns the ids of the budgets whose lines moved,
// so their thresholds can be evaluated again.
export type LineReassigner = (db: AppDatabase, scope: ReassignScope) => Promise<string[]>;

// For tests that do not care about movements.
export const noReassign: LineReassigner = () => Promise.resolve([]);
