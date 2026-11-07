import { beforeEach, describe, expect, it } from '@jest/globals';

import type { AppDatabase } from '@/core/db/database.types';
import { SEED_SYSTEM_CATEGORIES } from '@/core/db/seed-data';
import { createTestDatabase } from '@/core/db/testing/create-test-database';
import { err } from '@/core/shared/result';

import { createBudgetRepository, createInMemoryBudgetRepository } from './budget.repository';
import type { BudgetRepository } from './budget.repository';
import type { NewBudget } from './budget.types';

const ALIMENTACION = SEED_SYSTEM_CATEGORIES[0]?.id ?? '';
const ENTRETENIMIENTO = SEED_SYSTEM_CATEGORIES[2]?.id ?? '';
const NOW = '2026-11-06T10:00:00-05:00';

function counter() {
  let n = 0;
  return () => `budget-${(n += 1)}`;
}

const entertainment: NewBudget = {
  categoryId: ENTRETENIMIENTO,
  currency: 'USD',
  amountMinor: 5500,
  startDate: '2026-11-01',
  endDate: '2026-11-15',
};

// The same behavior must hold for the SQLite repository and the in-memory one.
const implementations: [string, () => Promise<BudgetRepository>][] = [
  ['sqlite', async () => createBudgetRepository(await createTestDatabase(), counter())],
  ['in-memory', () => Promise.resolve(createInMemoryBudgetRepository([], counter()))],
];

describe.each(implementations)('BudgetRepository (%s)', (_name, create) => {
  let repository: BudgetRepository;

  beforeEach(async () => {
    repository = await create();
  });

  it('RN-01 creates an ACTIVE budget with its data', async () => {
    const result = await repository.create(entertainment);

    expect(result.ok && result.value).toMatchObject({
      ...entertainment,
      status: 'ACTIVE',
      spentFinalMinor: null,
      deletedAt: null,
    });
  });

  it('RN-03 refuses a budget that overlaps another of the same category', async () => {
    await repository.create(entertainment);

    const clash = await repository.create({
      ...entertainment,
      currency: 'COP',
      startDate: '2026-11-10',
      endDate: '2026-11-30',
    });

    expect(clash).toEqual(err('BUDGET_OVERLAP'));
    expect(await repository.list()).toHaveLength(1);
  });

  it('RN-03 accepts the day after, and another category on the same dates', async () => {
    await repository.create(entertainment);

    const next = await repository.create({
      ...entertainment,
      startDate: '2026-11-16',
      endDate: '2026-11-30',
    });
    const otherCategory = await repository.create({ ...entertainment, categoryId: ALIMENTACION });

    expect(next.ok).toBe(true);
    expect(otherCategory.ok).toBe(true);
  });

  it('RN-06 / RN-07 updates amount and dates', async () => {
    const created = await repository.create(entertainment);
    const id = created.ok ? created.value.id : '';

    const updated = await repository.update(id, { amountMinor: 8000, endDate: '2026-11-20' });

    expect(updated.ok && updated.value).toMatchObject({ amountMinor: 8000, endDate: '2026-11-20' });
  });

  it('RN-07 an edit that makes dates overlap another budget is refused and nothing changes', async () => {
    await repository.create(entertainment);
    const second = await repository.create({
      ...entertainment,
      startDate: '2026-11-16',
      endDate: '2026-11-30',
    });
    const secondId = second.ok ? second.value.id : '';

    const result = await repository.update(secondId, { startDate: '2026-11-10' });

    expect(result).toEqual(err('BUDGET_OVERLAP'));
    expect((await repository.get(secondId))?.startDate).toBe('2026-11-16');
  });

  it('RN-07 editing a budget never collides with itself', async () => {
    const created = await repository.create(entertainment);
    const id = created.ok ? created.value.id : '';

    const result = await repository.update(id, { amountMinor: 9000 });

    expect(result.ok).toBe(true);
  });

  it('RN-10 soft delete hides the budget from the list but keeps it', async () => {
    const created = await repository.create(entertainment);
    const id = created.ok ? created.value.id : '';

    await repository.softDelete(id);

    expect(await repository.list()).toEqual([]);
    expect(await repository.list({ includeDeleted: true })).toHaveLength(1);
    expect((await repository.get(id))?.deletedAt).not.toBeNull();
  });

  it('RN-10 a deleted budget frees its dates for a new one', async () => {
    const created = await repository.create(entertainment);
    await repository.softDelete(created.ok ? created.value.id : '');

    expect((await repository.create(entertainment)).ok).toBe(true);
  });

  it('lists newest first and filters by category and status', async () => {
    await repository.create(entertainment);
    await repository.create({ ...entertainment, startDate: '2026-12-01', endDate: '2026-12-15' });
    await repository.create({ ...entertainment, categoryId: ALIMENTACION });

    const all = await repository.list();
    expect(all.map((b) => b.startDate)).toEqual(['2026-12-01', '2026-11-01', '2026-11-01']);
    expect(await repository.list({ categoryId: ALIMENTACION })).toHaveLength(1);
    expect(await repository.list({ status: 'CLOSED' })).toEqual([]);
  });

  it('RN-05 close stores the status and freezes the spent amount', async () => {
    const created = await repository.create(entertainment);
    const id = created.ok ? created.value.id : '';

    await repository.close(id, 3000);

    expect(await repository.get(id)).toMatchObject({
      status: 'CLOSED',
      spentFinalMinor: 3000,
    });
    expect((await repository.get(id))?.closedAt).not.toBeNull();
  });
});

describe('BudgetRepository spent amount (sqlite)', () => {
  let db: AppDatabase;
  let repository: BudgetRepository;
  let budgetId: string;

  async function addLine(
    movementId: string,
    kind: 'EXPENSE' | 'REFUND' | 'INCOME',
    amount: number,
    options: { deleted?: boolean; budget?: string | null } = {},
  ) {
    await db
      .insertInto('movement')
      .values({
        id: movementId,
        kind,
        currency_code: 'USD',
        total_minor: amount,
        occurred_at: NOW,
        local_date: '2026-11-06',
        payment_method: 'CASH',
        note: null,
        created_at: NOW,
        updated_at: NOW,
        deleted_at: options.deleted ? NOW : null,
      })
      .execute();
    await db
      .insertInto('movement_line')
      .values({
        id: `line-${movementId}`,
        movement_id: movementId,
        category_id: ENTRETENIMIENTO,
        budget_id: options.budget === undefined ? budgetId : options.budget,
        amount_minor: amount,
      })
      .execute();
  }

  beforeEach(async () => {
    db = await createTestDatabase();
    repository = createBudgetRepository(db, counter());
    const created = await repository.create(entertainment);
    budgetId = created.ok ? created.value.id : '';
  });

  it('is 0 when nothing was spent', async () => {
    expect(await repository.getSpentMinor(budgetId)).toBe(0);
  });

  it('RN-22 spent = expenses - refunds, ignoring incomes', async () => {
    await addLine('m1', 'EXPENSE', 4000);
    await addLine('m2', 'REFUND', 1000);
    await addLine('m3', 'INCOME', 1500);

    expect(await repository.getSpentMinor(budgetId)).toBe(3000);
  });

  it('RN-22 spent never goes below 0', async () => {
    await addLine('m1', 'EXPENSE', 500);
    await addLine('m2', 'REFUND', 900);

    expect(await repository.getSpentMinor(budgetId)).toBe(0);
  });

  it('RN-21 ignores deleted movements and lines of other budgets', async () => {
    await addLine('m1', 'EXPENSE', 4000, { deleted: true });
    await addLine('m2', 'EXPENSE', 700, { budget: null });
    await addLine('m3', 'EXPENSE', 200);

    expect(await repository.getSpentMinor(budgetId)).toBe(200);
  });
});

describe('BudgetRepository usage and lines (sqlite)', () => {
  let db: AppDatabase;
  let repository: BudgetRepository;
  let first: string;
  let second: string;

  async function addMovement(
    id: string,
    kind: 'EXPENSE' | 'REFUND' | 'INCOME',
    amount: number,
    budgetId: string | null,
    options: { deleted?: boolean; date?: string; note?: string | null } = {},
  ) {
    const date = options.date ?? '2026-11-06';
    await db
      .insertInto('movement')
      .values({
        id,
        kind,
        currency_code: 'USD',
        total_minor: amount,
        occurred_at: `${date}T10:00:00-05:00`,
        local_date: date,
        payment_method: 'CASH',
        note: options.note ?? null,
        created_at: NOW,
        updated_at: NOW,
        deleted_at: options.deleted ? NOW : null,
      })
      .execute();
    await db
      .insertInto('movement_line')
      .values({
        id: `line-${id}`,
        movement_id: id,
        category_id: ENTRETENIMIENTO,
        budget_id: budgetId,
        amount_minor: amount,
      })
      .execute();
  }

  beforeEach(async () => {
    db = await createTestDatabase();
    repository = createBudgetRepository(db, counter());
    const a = await repository.create(entertainment);
    const b = await repository.create({ ...entertainment, categoryId: ALIMENTACION });
    first = a.ok ? a.value.id : '';
    second = b.ok ? b.value.id : '';
  });

  it('RN-22 / RN-23 adds expenses, refunds and incomes apart for each budget', async () => {
    await addMovement('m1', 'EXPENSE', 4000, first);
    await addMovement('m2', 'EXPENSE', 500, first);
    await addMovement('m3', 'REFUND', 1000, first);
    await addMovement('m4', 'INCOME', 1500, first);
    await addMovement('m5', 'EXPENSE', 700, second);

    expect(await repository.listUsageTotals()).toEqual({
      [first]: { expenseMinor: 4500, refundMinor: 1000, incomeMinor: 1500 },
      [second]: { expenseMinor: 700, refundMinor: 0, incomeMinor: 0 },
    });
  });

  it('RN-21 / RN-41 ignores deleted movements and lines with no budget', async () => {
    await addMovement('m1', 'EXPENSE', 4000, first, { deleted: true });
    await addMovement('m2', 'EXPENSE', 700, null);
    await addMovement('m3', 'EXPENSE', 200, first);

    expect(await repository.listUsageTotals()).toEqual({
      [first]: { expenseMinor: 200, refundMinor: 0, incomeMinor: 0 },
    });
  });

  it('a budget with no lines is not in the totals', async () => {
    expect(await repository.listUsageTotals()).toEqual({});
  });

  it('lists the lines of one budget newest first, with the movement data', async () => {
    await addMovement('old', 'EXPENSE', 100, first, { date: '2026-11-02' });
    await addMovement('new', 'REFUND', 300, first, { date: '2026-11-09', note: 'Returned' });
    await addMovement('other', 'EXPENSE', 999, second);

    const lines = await repository.listLines(first, { limit: 20, offset: 0 });

    expect(lines.map((line) => line.movementId)).toEqual(['new', 'old']);
    expect(lines[0]).toMatchObject({
      kind: 'REFUND',
      amountMinor: 300,
      note: 'Returned',
      localDate: '2026-11-09',
    });
  });

  it('lists lines in pages and leaves out deleted movements', async () => {
    for (let i = 0; i < 25; i += 1) {
      await addMovement(`m${String(i).padStart(2, '0')}`, 'EXPENSE', 100, first, {
        date: `2026-11-${String(i + 1).padStart(2, '0')}`,
      });
    }
    await addMovement('gone', 'EXPENSE', 100, first, { deleted: true });

    const page1 = await repository.listLines(first, { limit: 20, offset: 0 });
    const page2 = await repository.listLines(first, { limit: 20, offset: 20 });

    expect([page1.length, page2.length]).toEqual([20, 5]);
    expect(new Set([...page1, ...page2].map((line) => line.movementId)).size).toBe(25);
  });
});
