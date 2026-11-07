import { beforeEach, describe, expect, it } from '@jest/globals';

import type { AppDatabase, BudgetTable } from './database.types';
import { SEED_SYSTEM_CATEGORIES } from './seed-data';
import { createTestDatabase } from './testing/create-test-database';

const ALIMENTACION = SEED_SYSTEM_CATEGORIES[0]?.id ?? '';
const TRANSPORTE = SEED_SYSTEM_CATEGORIES[1]?.id ?? '';
const NOW = '2026-11-06T10:00:00-05:00';

let db: AppDatabase;
let counter = 0;

function budgetRow(overrides: Partial<BudgetTable>): BudgetTable {
  counter += 1;
  return {
    id: `budget-${counter}`,
    category_id: ALIMENTACION,
    currency_code: 'COP',
    amount_minor: 100000,
    start_date: '2026-11-01',
    end_date: '2026-11-15',
    status: 'ACTIVE',
    spent_final_minor: null,
    closed_at: null,
    created_at: NOW,
    updated_at: NOW,
    deleted_at: null,
    ...overrides,
  };
}

const insertBudget = (overrides: Partial<BudgetTable> = {}) =>
  db.insertInto('budget').values(budgetRow(overrides)).execute();

beforeEach(async () => {
  db = await createTestDatabase();
});

describe('initial schema and seeds', () => {
  it('creates the 9 tables of the data model', async () => {
    const tables = await db.introspection.getTables();
    const names = tables.map((table) => table.name).filter((n) => !n.startsWith('kysely_'));

    expect(names.sort()).toEqual(
      [
        'alert_sent',
        'budget',
        'budget_threshold',
        'category',
        'currency',
        'movement',
        'movement_line',
        'settings',
        'user_profile',
      ].sort(),
    );
  });

  it('RN-32 seeds COP, USD and EUR with their decimals', async () => {
    const rows = await db.selectFrom('currency').selectAll().orderBy('code').execute();

    expect(rows.map((r) => [r.code, r.decimals])).toEqual([
      ['COP', 0],
      ['EUR', 2],
      ['USD', 2],
    ]);
  });

  it('RN-34 seeds the 6 system categories without a stored name', async () => {
    const rows = await db.selectFrom('category').selectAll().execute();

    expect(rows).toHaveLength(6);
    expect(rows.every((r) => r.is_system === 1 && r.name === null)).toBe(true);
    expect(rows.map((r) => r.code)).toContain('SIN_CLASIFICAR');
  });

  it('RN-35 custom category names are unique ignoring case', async () => {
    const custom = (id: string, name: string) =>
      db
        .insertInto('category')
        .values({
          id,
          code: null,
          name,
          icon: 'paw',
          color: '#000000',
          is_system: 0,
          archived_at: null,
          created_at: NOW,
          updated_at: NOW,
        })
        .execute();

    await custom('c1', 'Mascotas');
    await expect(custom('c2', 'MASCOTAS')).rejects.toThrow();
  });

  it('keeps settings and user_profile to a single row', async () => {
    await expect(
      db
        .insertInto('settings')
        .values({ id: 2, language: 'es', theme: 'SYSTEM', updated_at: NOW })
        .execute(),
    ).rejects.toThrow();
  });

  it('rejects invalid values with CHECK constraints', async () => {
    await expect(insertBudget({ amount_minor: 0 })).rejects.toThrow();
    await expect(
      insertBudget({ start_date: '2026-11-10', end_date: '2026-11-01' }),
    ).rejects.toThrow();
    await expect(insertBudget({ currency_code: 'GBP' })).rejects.toThrow(); // foreign key
  });
});

describe('RN-03 budget overlap triggers', () => {
  it('rejects a budget that overlaps another of the same category', async () => {
    await insertBudget();

    await expect(
      insertBudget({ start_date: '2026-11-10', end_date: '2026-11-30' }),
    ).rejects.toThrow('BUDGET_OVERLAP');
  });

  it('RN-03 rejects overlap even when the currency is different', async () => {
    await insertBudget({ currency_code: 'COP' });

    await expect(
      insertBudget({ currency_code: 'USD', start_date: '2026-11-15', end_date: '2026-11-20' }),
    ).rejects.toThrow('BUDGET_OVERLAP');
  });

  it('RN-03 allows adjacent ranges and other categories', async () => {
    await insertBudget();

    await insertBudget({ start_date: '2026-11-16', end_date: '2026-11-30' });
    await insertBudget({ category_id: TRANSPORTE });

    const count = await db.selectFrom('budget').select(db.fn.countAll().as('n')).executeTakeFirst();
    expect(Number(count?.n)).toBe(3);
  });

  it('RN-10 a deleted budget no longer blocks the dates', async () => {
    await insertBudget({ deleted_at: NOW });

    await insertBudget();
  });

  it('allows updating a budget without colliding with itself', async () => {
    await insertBudget({ id: 'b1' });

    await db.updateTable('budget').set({ amount_minor: 200000 }).where('id', '=', 'b1').execute();
    await db.updateTable('budget').set({ end_date: '2026-11-20' }).where('id', '=', 'b1').execute();
  });

  it('rejects an update that makes the dates overlap another budget', async () => {
    await insertBudget({ id: 'b1' });
    await insertBudget({ id: 'b2', start_date: '2026-11-16', end_date: '2026-11-30' });

    await expect(
      db.updateTable('budget').set({ end_date: '2026-11-20' }).where('id', '=', 'b1').execute(),
    ).rejects.toThrow('BUDGET_OVERLAP');
  });

  it('allows soft-deleting a budget', async () => {
    await insertBudget({ id: 'b1' });

    await db.updateTable('budget').set({ deleted_at: NOW }).where('id', '=', 'b1').execute();
  });
});
