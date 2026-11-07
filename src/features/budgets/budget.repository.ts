import { sql } from 'kysely';

import type { AppDatabase, BudgetTable } from '@/core/db/database.types';
import { isCurrencyCode } from '@/core/shared/currency';
import { rangesOverlap } from '@/core/shared/dates';
import { err, ok } from '@/core/shared/result';
import type { Result } from '@/core/shared/result';

import type { Budget, BudgetFilter, BudgetUpdate, NewBudget } from './budget.types';

export type BudgetSaveError = 'BUDGET_OVERLAP';

export interface BudgetRepository {
  // Newest first. Logically deleted budgets are left out unless asked for.
  list(filter?: BudgetFilter): Promise<Budget[]>;
  get(id: string): Promise<Budget | null>;
  // The database trigger is the last guard for RN-03; its error comes back as BUDGET_OVERLAP.
  create(input: NewBudget): Promise<Result<Budget, BudgetSaveError>>;
  update(id: string, change: BudgetUpdate): Promise<Result<Budget, BudgetSaveError>>;
  // RN-10: marks the budget as deleted; nothing is erased.
  softDelete(id: string): Promise<void>;
  // RN-05: stores the close and freezes what was spent.
  close(id: string, spentFinalMinor: number): Promise<void>;
  // Spent so far = expenses - refunds, never below 0 (calculation section of the rules).
  getSpentMinor(id: string): Promise<number>;
}

// Row (snake_case) -> entity (camelCase).
function toBudget(row: BudgetTable): Budget {
  if (!isCurrencyCode(row.currency_code)) throw new Error(`Unknown currency: ${row.currency_code}`);

  return {
    id: row.id,
    categoryId: row.category_id,
    currency: row.currency_code,
    amountMinor: row.amount_minor,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    spentFinalMinor: row.spent_final_minor,
    closedAt: row.closed_at,
    deletedAt: row.deleted_at,
  };
}

function isOverlapError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('BUDGET_OVERLAP');
}

export function createBudgetRepository(
  db: AppDatabase,
  generateId: () => string,
): BudgetRepository {
  async function get(id: string): Promise<Budget | null> {
    const row = await db.selectFrom('budget').selectAll().where('id', '=', id).executeTakeFirst();
    return row ? toBudget(row) : null;
  }

  async function required(id: string): Promise<Budget> {
    const budget = await get(id);
    if (!budget) throw new Error(`Budget ${id} not found`);

    return budget;
  }

  return {
    async list(filter = {}) {
      let query = db.selectFrom('budget').selectAll();
      if (!filter.includeDeleted) query = query.where('deleted_at', 'is', null);
      if (filter.categoryId) query = query.where('category_id', '=', filter.categoryId);
      if (filter.status) query = query.where('status', '=', filter.status);

      const rows = await query.orderBy('start_date', 'desc').orderBy('id').execute();
      return rows.map(toBudget);
    },

    get,

    async create(input) {
      const id = generateId();
      const now = new Date().toISOString();
      try {
        await db
          .insertInto('budget')
          .values({
            id,
            category_id: input.categoryId,
            currency_code: input.currency,
            amount_minor: input.amountMinor,
            start_date: input.startDate,
            end_date: input.endDate,
            status: 'ACTIVE',
            spent_final_minor: null,
            closed_at: null,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          })
          .execute();
      } catch (error) {
        if (isOverlapError(error)) return err('BUDGET_OVERLAP');
        throw error;
      }

      return ok(await required(id));
    },

    async update(id, change) {
      try {
        await db
          .updateTable('budget')
          .set({
            ...(change.amountMinor !== undefined ? { amount_minor: change.amountMinor } : {}),
            ...(change.startDate !== undefined ? { start_date: change.startDate } : {}),
            ...(change.endDate !== undefined ? { end_date: change.endDate } : {}),
            updated_at: new Date().toISOString(),
          })
          .where('id', '=', id)
          .execute();
      } catch (error) {
        if (isOverlapError(error)) return err('BUDGET_OVERLAP');
        throw error;
      }

      return ok(await required(id));
    },

    async softDelete(id) {
      const now = new Date().toISOString();
      await db
        .updateTable('budget')
        .set({ deleted_at: now, updated_at: now })
        .where('id', '=', id)
        .execute();
    },

    async close(id, spentFinalMinor) {
      const now = new Date().toISOString();
      await db
        .updateTable('budget')
        .set({
          status: 'CLOSED',
          spent_final_minor: spentFinalMinor,
          closed_at: now,
          updated_at: now,
        })
        .where('id', '=', id)
        .execute();
    },

    async getSpentMinor(id) {
      const row = await db
        .selectFrom('movement_line as line')
        .innerJoin('movement', 'movement.id', 'line.movement_id')
        .select(
          sql<number>`coalesce(sum(case movement.kind
            when 'EXPENSE' then line.amount_minor
            when 'REFUND' then -line.amount_minor
            else 0 end), 0)`.as('spent'),
        )
        .where('line.budget_id', '=', id)
        .where('movement.deleted_at', 'is', null)
        .executeTakeFirst();

      return Math.max(0, Number(row?.spent ?? 0));
    },
  };
}

// For tests of ViewModels and screens: same behavior (including the overlap guard), no database.
// `spentById` fakes what the movements would add up to.
export function createInMemoryBudgetRepository(
  initial: readonly Budget[],
  generateId: () => string,
  spentById: Readonly<Record<string, number>> = {},
): BudgetRepository {
  let budgets: Budget[] = [...initial];

  function overlaps(candidate: Budget): boolean {
    return budgets.some(
      (other) =>
        other.id !== candidate.id &&
        other.deletedAt === null &&
        other.categoryId === candidate.categoryId &&
        rangesOverlap(
          { start: candidate.startDate, end: candidate.endDate },
          { start: other.startDate, end: other.endDate },
        ),
    );
  }

  function find(id: string): Budget {
    const budget = budgets.find((candidate) => candidate.id === id);
    if (!budget) throw new Error(`Budget ${id} not found`);

    return budget;
  }

  function replace(updated: Budget): Budget {
    budgets = budgets.map((budget) => (budget.id === updated.id ? updated : budget));
    return updated;
  }

  return {
    list(filter = {}) {
      return Promise.resolve(
        budgets
          .filter((budget) => filter.includeDeleted || budget.deletedAt === null)
          .filter((budget) => !filter.categoryId || budget.categoryId === filter.categoryId)
          .filter((budget) => !filter.status || budget.status === filter.status)
          .sort((a, b) => b.startDate.localeCompare(a.startDate) || a.id.localeCompare(b.id)),
      );
    },
    get: (id) => Promise.resolve(budgets.find((budget) => budget.id === id) ?? null),
    create(input) {
      const budget: Budget = {
        id: generateId(),
        categoryId: input.categoryId,
        currency: input.currency,
        amountMinor: input.amountMinor,
        startDate: input.startDate,
        endDate: input.endDate,
        status: 'ACTIVE',
        spentFinalMinor: null,
        closedAt: null,
        deletedAt: null,
      };
      if (overlaps(budget)) return Promise.resolve(err('BUDGET_OVERLAP'));
      budgets = [...budgets, budget];

      return Promise.resolve(ok(budget));
    },
    update(id, change) {
      const updated: Budget = { ...find(id), ...change };
      if (overlaps(updated)) return Promise.resolve(err('BUDGET_OVERLAP'));

      return Promise.resolve(ok(replace(updated)));
    },
    softDelete(id) {
      replace({ ...find(id), deletedAt: new Date().toISOString() });
      return Promise.resolve();
    },
    close(id, spentFinalMinor) {
      replace({
        ...find(id),
        status: 'CLOSED',
        spentFinalMinor,
        closedAt: new Date().toISOString(),
      });
      return Promise.resolve();
    },
    getSpentMinor: (id) => Promise.resolve(spentById[id] ?? 0),
  };
}
