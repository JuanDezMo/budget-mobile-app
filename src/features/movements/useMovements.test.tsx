import { describe, expect, it } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { addDaysToLocalDate, todayLocalDate } from '@/core/shared/dates';

import { createInMemoryMovementRepository } from './movement.repository';
import type { MovementRepository } from './movement.repository';
import { budgetAssignmentRules } from './movement.rules';
import type { Movement } from './movement.types';
import { MovementRepositoryProvider } from './useMovementRepository';
import { useMovements } from './useMovements';

const today = todayLocalDate();

function movement(index: number, overrides: Partial<Movement> = {}): Movement {
  const date = addDaysToLocalDate(today, -index);
  return {
    id: `m-${String(index).padStart(3, '0')}`,
    kind: 'EXPENSE',
    currency: 'USD',
    totalMinor: 100,
    occurredAt: `${date}T10:00:00-05:00`,
    localDate: date,
    paymentMethod: 'CASH',
    note: null,
    lines: [],
    deletedAt: null,
    ...overrides,
  };
}

let repository: MovementRepository;

function setup(count: number, extra: Movement[] = []) {
  repository = createInMemoryMovementRepository(
    () => [],
    () => 'x',
    budgetAssignmentRules,
    [...Array.from({ length: count }, (_, i) => movement(i + 1)), ...extra],
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MovementRepositoryProvider value={repository}>{children}</MovementRepositoryProvider>
  );

  return renderHook(() => useMovements(), { wrapper });
}

describe('useMovements pagination', () => {
  it('loads only 20 movements at first', async () => {
    const { result } = await setup(45);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.movements).toHaveLength(20);
    expect(result.current.hasMore).toBe(true);
  });

  it('loads the next page of 20 each time the list reaches its end, until it runs out', async () => {
    const { result } = await setup(45);
    await waitFor(() => expect(result.current.movements).toHaveLength(20));

    await act(async () => {
      await result.current.loadMore();
    });
    expect(result.current.movements).toHaveLength(40);
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });
    expect(result.current.movements).toHaveLength(45);
    expect(result.current.hasMore).toBe(false);
    expect(new Set(result.current.movements.map((m) => m.id)).size).toBe(45);
  });

  it('does nothing when there are no more pages', async () => {
    const { result } = await setup(5);
    await waitFor(() => expect(result.current.movements).toHaveLength(5));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.movements).toHaveLength(5);
    expect(result.current.hasMore).toBe(false);
  });

  it('exactly one full page does not claim there is more', async () => {
    const { result } = await setup(20);

    await waitFor(() => expect(result.current.movements).toHaveLength(20));
    expect(result.current.hasMore).toBe(false);
  });

  it('RN-33 totals count the whole history even when only a page is loaded', async () => {
    const { result } = await setup(45, [
      movement(100, { currency: 'COP', totalMinor: 5000, kind: 'INCOME' }),
    ]);

    await waitFor(() => expect(result.current.totals).toHaveLength(2));
    expect(result.current.movements).toHaveLength(20);
    expect(result.current.totals).toEqual([
      { currency: 'COP', expense: 0, refund: 0, income: 5000 },
      { currency: 'USD', expense: 4500, refund: 0, income: 0 },
    ]);
  });

  it('changing a filter starts again from the first page', async () => {
    const { result } = await setup(45, [movement(100, { currency: 'COP', totalMinor: 5000 })]);
    await waitFor(() => expect(result.current.movements).toHaveLength(20));
    await act(async () => {
      await result.current.loadMore();
    });
    expect(result.current.movements).toHaveLength(40);

    await act(async () => {
      result.current.setCurrency('COP');
    });

    await waitFor(() => expect(result.current.movements).toHaveLength(1));
    expect(result.current.hasMore).toBe(false);
    expect(result.current.totals).toEqual([
      { currency: 'COP', expense: 5000, refund: 0, income: 0 },
    ]);
  });
});
