import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Migration } from 'kysely/migration';

// RN-03: a category cannot have two live budgets whose dates overlap, whatever the currency.
// Two ranges overlap when `new.start <= other.end AND new.end >= other.start`.
// The domain validates first to show a friendly error; these triggers are the last guard.
const overlapCondition = (excludeSelf: boolean) => `
  EXISTS (
    SELECT 1 FROM budget AS other
    WHERE other.category_id = NEW.category_id
      AND other.deleted_at IS NULL
      ${excludeSelf ? 'AND other.id <> NEW.id' : ''}
      AND NEW.start_date <= other.end_date
      AND NEW.end_date >= other.start_date
  )`;

const statements: readonly string[] = [
  `CREATE TRIGGER trg_budget_overlap_insert
   BEFORE INSERT ON budget
   WHEN NEW.deleted_at IS NULL AND ${overlapCondition(false)}
   BEGIN
     SELECT RAISE(ABORT, 'BUDGET_OVERLAP');
   END`,
  // The UPDATE trigger must skip the row being updated, or it would collide with itself.
  `CREATE TRIGGER trg_budget_overlap_update
   BEFORE UPDATE ON budget
   WHEN NEW.deleted_at IS NULL AND ${overlapCondition(true)}
   BEGIN
     SELECT RAISE(ABORT, 'BUDGET_OVERLAP');
   END`,
];

export const budgetOverlapTriggers: Migration = {
  async up(db: Kysely<unknown>) {
    for (const statement of statements) {
      await sql.raw(statement).execute(db);
    }
  },
};
