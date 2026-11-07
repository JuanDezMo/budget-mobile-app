import { beforeEach, describe, expect, it } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { SEED_SYSTEM_CATEGORIES } from '@/core/db/seed-data';
import { createTestDatabase } from '@/core/db/testing/create-test-database';
import { addDaysToLocalDate, todayLocalDate } from '@/core/shared/dates';

import { createBudgetRepository, createInMemoryBudgetRepository } from './budget.repository';
import type { BudgetRepository } from './budget.repository';
import type { Budget } from './budget.types';
import { BudgetRepositoryProvider } from './useBudgetRepository';
import { closeExpiredBudgets, useBudgets } from './useBudgets';

const ENTRETENIMIENTO = SEED_SYSTEM_CATEGORIES[2]?.id ?? '';
const today = todayLocalDate();

function budgetEndingIn(
  id: string,
  daysFromToday: number,
  overrides: Partial<Budget> = {},
): Budget {
  const endDate = addDaysToLocalDate(today, daysFromToday);
  return {
    id,
    categoryId: ENTRETENIMIENTO,
    currency: 'USD',
    amountMinor: 5500,
    startDate: addDaysToLocalDate(endDate, -9),
    endDate,
    status: 'ACTIVE',
    spentFinalMinor: null,
    closedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

describe('useBudgets', () => {
  let repository: BudgetRepository;

  beforeEach(() => {
    repository = createInMemoryBudgetRepository(
      [
        budgetEndingIn('active', 5),
        budgetEndingIn('grace', -3),
        budgetEndingIn('expired', -30),
        budgetEndingIn('stored-closed', 5, { status: 'CLOSED', spentFinalMinor: 100 }),
      ],
      () => 'x',
    );
  });

  it('RN-05 groups budgets into active, in grace and closed', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <BudgetRepositoryProvider value={repository}>{children}</BudgetRepositoryProvider>
    );
    const { result } = await renderHook(() => useBudgets(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.active.map((item) => item.budget.id)).toEqual(['active']);
    expect(result.current.grace.map((item) => item.budget.id)).toEqual(['grace']);
    expect(result.current.closed.map((item) => item.budget.id).sort()).toEqual([
      'expired',
      'stored-closed',
    ]);
  });
});

describe('closeExpiredBudgets (RN-05 lazy close)', () => {
  it('RN-05 closes only ACTIVE budgets past their grace period', async () => {
    const repository = createInMemoryBudgetRepository(
      [budgetEndingIn('active', 5), budgetEndingIn('grace', -5), budgetEndingIn('expired', -6)],
      () => 'x',
    );

    const closed = await closeExpiredBudgets(repository, today);

    expect(closed).toBe(1);
    expect((await repository.get('expired'))?.status).toBe('CLOSED');
    expect((await repository.get('grace'))?.status).toBe('ACTIVE');
    expect((await repository.get('active'))?.status).toBe('ACTIVE');
  });

  it('RN-05 freezes the spent amount at the moment it closes', async () => {
    const repository = createInMemoryBudgetRepository([budgetEndingIn('expired', -30)], () => 'x', {
      expired: 3000,
    });

    await closeExpiredBudgets(repository, today);

    expect(await repository.get('expired')).toMatchObject({
      status: 'CLOSED',
      spentFinalMinor: 3000,
    });
  });

  it('RN-05 does not close a budget twice and ignores deleted ones', async () => {
    const repository = createInMemoryBudgetRepository(
      [
        budgetEndingIn('done', -30, { status: 'CLOSED', spentFinalMinor: 7 }),
        budgetEndingIn('gone', -30, { deletedAt: '2026-10-01T00:00:00Z' }),
      ],
      () => 'x',
    );

    expect(await closeExpiredBudgets(repository, today)).toBe(0);
    expect((await repository.get('done'))?.spentFinalMinor).toBe(7);
    expect((await repository.get('gone'))?.status).toBe('ACTIVE');
  });

  it('RN-05 closing is safe to repeat every time the app opens', async () => {
    const repository = createInMemoryBudgetRepository([budgetEndingIn('expired', -30)], () => 'x');

    expect(await closeExpiredBudgets(repository, today)).toBe(1);
    expect(await closeExpiredBudgets(repository, today)).toBe(0);
  });

  it('RN-05 works against SQLite and uses the real movements for the frozen amount', async () => {
    const db = await createTestDatabase();
    const repository = createBudgetRepository(db, () => 'sql-budget');
    const endDate = addDaysToLocalDate(today, -30);
    await repository.create({
      categoryId: ENTRETENIMIENTO,
      currency: 'USD',
      amountMinor: 5500,
      startDate: addDaysToLocalDate(endDate, -9),
      endDate,
    });
    const now = '2026-10-01T10:00:00-05:00';
    await db
      .insertInto('movement')
      .values({
        id: 'm1',
        kind: 'EXPENSE',
        currency_code: 'USD',
        total_minor: 4000,
        occurred_at: now,
        local_date: '2026-10-01',
        payment_method: 'CASH',
        note: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
      .execute();
    await db
      .insertInto('movement_line')
      .values({
        id: 'l1',
        movement_id: 'm1',
        category_id: ENTRETENIMIENTO,
        budget_id: 'sql-budget',
        amount_minor: 4000,
      })
      .execute();

    await closeExpiredBudgets(repository, today);

    expect(await repository.get('sql-budget')).toMatchObject({
      status: 'CLOSED',
      spentFinalMinor: 4000,
    });
  });
});
