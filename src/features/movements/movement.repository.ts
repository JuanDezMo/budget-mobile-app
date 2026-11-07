import { sql } from 'kysely';

import type {
  AppDatabase,
  BudgetTable,
  MovementLineTable,
  MovementTable,
} from '@/core/db/database.types';
import type { LineReassigner } from '@/core/db/line-reassigner';
import { isCurrencyCode } from '@/core/shared/currency';
import type { CurrencyCode } from '@/core/shared/currency';
import { localDateOf, todayLocalDate } from '@/core/shared/dates';
import type { LocalDate } from '@/core/shared/dates';

import type {
  AssignableBudget,
  BudgetAssignmentRules,
  CurrencyTotals,
  Movement,
  MovementFilter,
  MovementPage,
  NewMovement,
} from './movement.types';

export interface MovementRepository {
  // Newest first, deleted movements left out (RN-21). Without `page` it returns everything;
  // the history asks one page at a time.
  list(filter?: MovementFilter, page?: MovementPage): Promise<Movement[]>;
  // Totals of ALL the movements that match the filter, not only the loaded page (RN-33).
  summarize(filter?: MovementFilter): Promise<CurrencyTotals[]>;
  get(id: string): Promise<Movement | null>;
  // Header and lines are saved together, each line with the budget the app assigns (RN-17).
  create(input: NewMovement): Promise<Movement>;
  // Replaces header and lines and reassigns budgets in the same transaction (RN-39, case 1).
  update(id: string, input: NewMovement): Promise<Movement>;
  // RN-21: marks the movement as deleted; nothing is erased.
  softDelete(id: string): Promise<void>;
  // Budgets as the assignment rules see them (for the form preview and for the closed-budget lock).
  listBudgets(): Promise<AssignableBudget[]>;
}

type LineRow = Pick<MovementLineTable, 'id' | 'category_id' | 'budget_id' | 'amount_minor'>;

// Rows (snake_case) -> entity (camelCase).
function toMovement(row: MovementTable, lines: readonly LineRow[]): Movement {
  if (!isCurrencyCode(row.currency_code)) throw new Error(`Unknown currency: ${row.currency_code}`);

  return {
    id: row.id,
    kind: row.kind,
    currency: row.currency_code,
    totalMinor: row.total_minor,
    occurredAt: row.occurred_at,
    localDate: row.local_date,
    paymentMethod: row.payment_method,
    note: row.note,
    lines: lines.map((line) => ({
      id: line.id,
      categoryId: line.category_id,
      budgetId: line.budget_id,
      amountMinor: line.amount_minor,
    })),
    deletedAt: row.deleted_at,
  };
}

function toAssignableBudget(row: BudgetTable): AssignableBudget | null {
  if (!isCurrencyCode(row.currency_code)) return null;

  return {
    id: row.id,
    categoryId: row.category_id,
    currency: row.currency_code,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    deletedAt: row.deleted_at,
  };
}

async function loadBudgets(db: AppDatabase): Promise<AssignableBudget[]> {
  const rows = await db.selectFrom('budget').selectAll().execute();
  return rows.flatMap((row) => toAssignableBudget(row) ?? []);
}

// RN-39: recalculates the budget of the lines in scope. Lines that count in a closed budget are
// left alone (RN-08). Used by budget create / edit-dates / delete, inside their transaction.
export function createLineReassigner(rules: BudgetAssignmentRules): LineReassigner {
  return async (db, scope) => {
    let query = db
      .selectFrom('movement_line as line')
      .innerJoin('movement', 'movement.id', 'line.movement_id')
      .select([
        'line.id as id',
        'line.budget_id as budget_id',
        'line.category_id as category_id',
        'movement.currency_code as currency_code',
        'movement.local_date as local_date',
      ])
      .where('movement.deleted_at', 'is', null);
    if (scope.categoryId) query = query.where('line.category_id', '=', scope.categoryId);
    if (scope.movementId) query = query.where('movement.id', '=', scope.movementId);

    const lines = await query.execute();
    if (lines.length === 0) return [];
    const budgets = await loadBudgets(db);
    const affected = new Set<string>();

    for (const line of lines) {
      if (!isCurrencyCode(line.currency_code)) continue;
      const current = budgets.find((budget) => budget.id === line.budget_id);
      if (rules.isFrozen(current, scope.today)) continue;

      const target = rules.pickBudgetId(
        { categoryId: line.category_id, currency: line.currency_code, localDate: line.local_date },
        budgets,
        scope.today,
      );
      if (target === line.budget_id) continue;

      await db
        .updateTable('movement_line')
        .set({ budget_id: target })
        .where('id', '=', line.id)
        .execute();
      if (line.budget_id) affected.add(line.budget_id);
      if (target) affected.add(target);
    }

    return [...affected];
  };
}

export function createMovementRepository(
  db: AppDatabase,
  generateId: () => string,
  rules: BudgetAssignmentRules,
): MovementRepository {
  async function get(id: string): Promise<Movement | null> {
    const row = await db.selectFrom('movement').selectAll().where('id', '=', id).executeTakeFirst();
    if (!row) return null;
    const lines = await db
      .selectFrom('movement_line')
      .select(['id', 'category_id', 'budget_id', 'amount_minor'])
      .where('movement_id', '=', id)
      .orderBy(sql`rowid`)
      .execute();

    return toMovement(row, lines);
  }

  async function required(id: string): Promise<Movement> {
    const movement = await get(id);
    if (!movement) throw new Error(`Movement ${id} not found`);

    return movement;
  }

  // Inserts the lines inside the caller's transaction, each with its assigned budget.
  async function insertLines(
    trx: AppDatabase,
    movementId: string,
    input: NewMovement,
    localDate: LocalDate,
  ) {
    const budgets = await loadBudgets(trx);
    const today = todayLocalDate();

    for (const line of input.lines) {
      await trx
        .insertInto('movement_line')
        .values({
          id: generateId(),
          movement_id: movementId,
          category_id: line.categoryId,
          budget_id: rules.pickBudgetId(
            { categoryId: line.categoryId, currency: input.currency, localDate },
            budgets,
            today,
          ),
          amount_minor: line.amountMinor,
        })
        .execute();
    }
  }

  return {
    async list(filter = {}, page) {
      // First choose the movements of the page, then read their lines: paginating the joined
      // rows would cut a movement in half.
      let idsQuery = db
        .selectFrom('movement')
        .select('movement.id')
        .where('movement.deleted_at', 'is', null);
      if (filter.kind) idsQuery = idsQuery.where('movement.kind', '=', filter.kind);
      if (filter.currency)
        idsQuery = idsQuery.where('movement.currency_code', '=', filter.currency);
      idsQuery = idsQuery
        .orderBy('movement.local_date', 'desc')
        .orderBy('movement.occurred_at', 'desc')
        .orderBy('movement.id');
      if (page) idsQuery = idsQuery.limit(page.limit).offset(page.offset);
      const ids = (await idsQuery.execute()).map((row) => row.id);
      if (ids.length === 0) return [];

      const rows = await db
        .selectFrom('movement')
        .leftJoin('movement_line as line', 'line.movement_id', 'movement.id')
        .selectAll('movement')
        .select([
          'line.id as line_id',
          'line.category_id as line_category_id',
          'line.budget_id as line_budget_id',
          'line.amount_minor as line_amount_minor',
        ])
        .where('movement.id', 'in', ids)
        .orderBy('movement.local_date', 'desc')
        .orderBy('movement.occurred_at', 'desc')
        .orderBy('movement.id')
        .orderBy(sql`line.rowid`)
        .execute();

      const grouped = new Map<string, { row: MovementTable; lines: LineRow[] }>();
      for (const { line_id, line_category_id, line_budget_id, line_amount_minor, ...row } of rows) {
        const entry = grouped.get(row.id) ?? { row, lines: [] };
        if (line_id !== null && line_category_id !== null && line_amount_minor !== null) {
          entry.lines.push({
            id: line_id,
            category_id: line_category_id,
            budget_id: line_budget_id,
            amount_minor: line_amount_minor,
          });
        }
        grouped.set(row.id, entry);
      }

      return [...grouped.values()].map(({ row, lines }) => toMovement(row, lines));
    },

    async summarize(filter = {}) {
      let query = db
        .selectFrom('movement')
        .select(['currency_code', 'kind', sql<number>`sum(total_minor)`.as('total')])
        .where('deleted_at', 'is', null);
      if (filter.kind) query = query.where('kind', '=', filter.kind);
      if (filter.currency) query = query.where('currency_code', '=', filter.currency);
      const rows = await query.groupBy(['currency_code', 'kind']).execute();

      const totals = new Map<CurrencyCode, CurrencyTotals>();
      for (const row of rows) {
        if (!isCurrencyCode(row.currency_code)) continue;
        const entry = totals.get(row.currency_code) ?? {
          currency: row.currency_code,
          expense: 0,
          refund: 0,
          income: 0,
        };
        const total = Number(row.total);
        if (row.kind === 'EXPENSE') entry.expense = total;
        else if (row.kind === 'REFUND') entry.refund = total;
        else entry.income = total;
        totals.set(row.currency_code, entry);
      }

      return [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency));
    },

    get,

    async create(input) {
      const id = generateId();
      const now = new Date().toISOString();
      const localDate = localDateOf(input.occurredAt);

      await db.transaction().execute(async (trx) => {
        await trx
          .insertInto('movement')
          .values({
            id,
            kind: input.kind,
            currency_code: input.currency,
            total_minor: input.totalMinor,
            occurred_at: input.occurredAt,
            local_date: localDate,
            payment_method: input.paymentMethod,
            note: input.note,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          })
          .execute();
        await insertLines(trx, id, input, localDate);
      });

      return required(id);
    },

    async update(id, input) {
      const localDate = localDateOf(input.occurredAt);

      await db.transaction().execute(async (trx) => {
        await trx
          .updateTable('movement')
          .set({
            kind: input.kind,
            currency_code: input.currency,
            total_minor: input.totalMinor,
            occurred_at: input.occurredAt,
            local_date: localDate,
            payment_method: input.paymentMethod,
            note: input.note,
            updated_at: new Date().toISOString(),
          })
          .where('id', '=', id)
          .execute();
        await trx.deleteFrom('movement_line').where('movement_id', '=', id).execute();
        await insertLines(trx, id, input, localDate);
      });

      return required(id);
    },

    async softDelete(id) {
      const now = new Date().toISOString();
      await db
        .updateTable('movement')
        .set({ deleted_at: now, updated_at: now })
        .where('id', '=', id)
        .execute();
    },

    listBudgets: () => loadBudgets(db),
  };
}

// For tests of ViewModels and screens: same behavior (including assignment), no database.
// `budgets` is read every time, so a test can add budgets after creating the repository.
export function createInMemoryMovementRepository(
  budgets: () => readonly AssignableBudget[],
  generateId: () => string,
  rules: BudgetAssignmentRules,
  initial: readonly Movement[] = [],
): MovementRepository {
  let movements: Movement[] = [...initial];

  function build(id: string, input: NewMovement): Movement {
    const localDate = localDateOf(input.occurredAt);
    const today = todayLocalDate();

    return {
      id,
      kind: input.kind,
      currency: input.currency,
      totalMinor: input.totalMinor,
      occurredAt: input.occurredAt,
      localDate,
      paymentMethod: input.paymentMethod,
      note: input.note,
      lines: input.lines.map((line) => ({
        id: generateId(),
        categoryId: line.categoryId,
        budgetId: rules.pickBudgetId(
          { categoryId: line.categoryId, currency: input.currency, localDate },
          budgets(),
          today,
        ),
        amountMinor: line.amountMinor,
      })),
      deletedAt: null,
    };
  }

  return {
    list: (filter = {}, page) => {
      const sorted = movements
        .filter((movement) => movement.deletedAt === null)
        .filter((movement) => !filter.kind || movement.kind === filter.kind)
        .filter((movement) => !filter.currency || movement.currency === filter.currency)
        .sort(
          (a, b) =>
            b.localDate.localeCompare(a.localDate) ||
            b.occurredAt.localeCompare(a.occurredAt) ||
            a.id.localeCompare(b.id),
        );

      return Promise.resolve(page ? sorted.slice(page.offset, page.offset + page.limit) : sorted);
    },
    summarize(filter = {}) {
      const totals = new Map<CurrencyCode, CurrencyTotals>();
      for (const movement of movements) {
        if (movement.deletedAt !== null) continue;
        if (filter.kind && movement.kind !== filter.kind) continue;
        if (filter.currency && movement.currency !== filter.currency) continue;
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

      return Promise.resolve(
        [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
      );
    },
    get: (id) => Promise.resolve(movements.find((movement) => movement.id === id) ?? null),
    create(input) {
      const movement = build(generateId(), input);
      movements = [...movements, movement];

      return Promise.resolve(movement);
    },
    update(id, input) {
      const movement = build(id, input);
      movements = movements.map((candidate) => (candidate.id === id ? movement : candidate));

      return Promise.resolve(movement);
    },
    softDelete(id) {
      movements = movements.map((movement) =>
        movement.id === id ? { ...movement, deletedAt: new Date().toISOString() } : movement,
      );
      return Promise.resolve();
    },
    listBudgets: () => Promise.resolve([...budgets()]),
  };
}
