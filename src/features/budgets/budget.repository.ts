import { sql } from 'kysely';

import type { AppDatabase, BudgetTable } from '@/core/db/database.types';
import { noReassign } from '@/core/db/line-reassigner';
import type { LineReassigner } from '@/core/db/line-reassigner';
import { isCurrencyCode } from '@/core/shared/currency';
import { rangesOverlap, todayLocalDate } from '@/core/shared/dates';
import { err, ok } from '@/core/shared/result';
import type { Result } from '@/core/shared/result';

import { ZERO_USAGE_TOTALS } from './budget.types';
import type {
  Budget,
  BudgetFilter,
  BudgetLine,
  BudgetUpdate,
  NewBudget,
  UsageTotals,
} from './budget.types';

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
  // What the lines assigned to each budget add up to, by kind (RN-22, RN-23). One query for all
  // the budgets, so a list does not ask once per budget. Budgets with no lines are not in the map.
  listUsageTotals(): Promise<Record<string, UsageTotals>>;
  // The lines counting for a budget, newest first, one page at a time. Lines of deleted
  // movements are left out (RN-21).
  listLines(budgetId: string, page: { limit: number; offset: number }): Promise<BudgetLine[]>;
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

// `reassignLines` keeps movement lines in step with the budget (RN-39). It runs inside the same
// transaction as the budget write, so either both happen or neither does.
export function createBudgetRepository(
  db: AppDatabase,
  generateId: () => string,
  reassignLines: LineReassigner = noReassign,
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
        await db.transaction().execute(async (trx) => {
          await trx
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
          // RN-39 (2): the new budget takes the unassigned lines that fit it.
          await reassignLines(trx, { categoryId: input.categoryId, today: todayLocalDate() });
        });
      } catch (error) {
        if (isOverlapError(error)) return err('BUDGET_OVERLAP');
        throw error;
      }

      return ok(await required(id));
    },

    async update(id, change) {
      const current = await required(id);
      try {
        await db.transaction().execute(async (trx) => {
          await trx
            .updateTable('budget')
            .set({
              ...(change.amountMinor !== undefined ? { amount_minor: change.amountMinor } : {}),
              ...(change.startDate !== undefined ? { start_date: change.startDate } : {}),
              ...(change.endDate !== undefined ? { end_date: change.endDate } : {}),
              updated_at: new Date().toISOString(),
            })
            .where('id', '=', id)
            .execute();
          // RN-39 (3): new dates may free some lines and cover others.
          if (change.startDate !== undefined || change.endDate !== undefined) {
            await reassignLines(trx, { categoryId: current.categoryId, today: todayLocalDate() });
          }
        });
      } catch (error) {
        if (isOverlapError(error)) return err('BUDGET_OVERLAP');
        throw error;
      }

      return ok(await required(id));
    },

    async softDelete(id) {
      const current = await required(id);
      const now = new Date().toISOString();
      await db.transaction().execute(async (trx) => {
        await trx
          .updateTable('budget')
          .set({ deleted_at: now, updated_at: now })
          .where('id', '=', id)
          .execute();
        // RN-39 (4): its lines stay, but no longer count for it.
        await reassignLines(trx, { categoryId: current.categoryId, today: todayLocalDate() });
      });
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

    async listUsageTotals() {
      const rows = await db
        .selectFrom('movement_line as line')
        .innerJoin('movement', 'movement.id', 'line.movement_id')
        .select([
          'line.budget_id as budget_id',
          'movement.kind as kind',
          sql<number>`sum(line.amount_minor)`.as('total'),
        ])
        .where('line.budget_id', 'is not', null)
        .where('movement.deleted_at', 'is', null)
        .groupBy(['line.budget_id', 'movement.kind'])
        .execute();

      const totals: Record<string, UsageTotals> = {};
      for (const row of rows) {
        if (row.budget_id === null) continue;
        const entry = totals[row.budget_id] ?? { ...ZERO_USAGE_TOTALS };
        const total = Number(row.total);
        if (row.kind === 'EXPENSE') entry.expenseMinor = total;
        else if (row.kind === 'REFUND') entry.refundMinor = total;
        else entry.incomeMinor = total;
        totals[row.budget_id] = entry;
      }

      return totals;
    },

    async listLines(budgetId, page) {
      const rows = await db
        .selectFrom('movement_line as line')
        .innerJoin('movement', 'movement.id', 'line.movement_id')
        .select([
          'line.id as line_id',
          'movement.id as movement_id',
          'movement.kind as kind',
          'movement.local_date as local_date',
          'movement.note as note',
          'line.category_id as category_id',
          'line.amount_minor as amount_minor',
        ])
        .where('line.budget_id', '=', budgetId)
        .where('movement.deleted_at', 'is', null)
        .orderBy('movement.local_date', 'desc')
        .orderBy('movement.occurred_at', 'desc')
        .orderBy('line.id')
        .limit(page.limit)
        .offset(page.offset)
        .execute();

      return rows.map((row) => ({
        lineId: row.line_id,
        movementId: row.movement_id,
        kind: row.kind,
        localDate: row.local_date,
        note: row.note,
        categoryId: row.category_id,
        amountMinor: row.amount_minor,
      }));
    },
  };
}

// For tests of ViewModels and screens: same behavior (including the overlap guard), no database.
// `spentById` fakes what the movements would add up to.
export function createInMemoryBudgetRepository(
  initial: readonly Budget[],
  generateId: () => string,
  spentById: Readonly<Record<string, number>> = {},
  // Usage and lines to fake, per budget id (the movements themselves live in another repository).
  fake: {
    usageById?: Readonly<Record<string, UsageTotals>>;
    linesById?: Readonly<Record<string, readonly BudgetLine[]>>;
  } = {},
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
    getSpentMinor(id) {
      const usage = fake.usageById?.[id];
      if (usage) return Promise.resolve(Math.max(0, usage.expenseMinor - usage.refundMinor));

      return Promise.resolve(spentById[id] ?? 0);
    },
    listUsageTotals() {
      const totals: Record<string, UsageTotals> = { ...fake.usageById };
      for (const [id, spent] of Object.entries(spentById)) {
        totals[id] ??= { expenseMinor: spent, refundMinor: 0, incomeMinor: 0 };
      }

      return Promise.resolve(totals);
    },
    listLines: (budgetId, page) =>
      Promise.resolve(
        (fake.linesById?.[budgetId] ?? []).slice(page.offset, page.offset + page.limit),
      ),
  };
}
