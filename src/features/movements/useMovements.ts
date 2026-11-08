import { useCallback, useEffect, useState } from 'react';

import type { CurrencyCode } from '@/core/shared/currency';
import { addDaysToLocalDate, todayLocalDate } from '@/core/shared/dates';
import type { LocalDate } from '@/core/shared/dates';

import { MOVEMENT_PAGE_SIZE } from './movement.types';
import type { CurrencyTotals, Movement, MovementKind } from './movement.types';
import { useMovementRepository } from './useMovementRepository';

// One entry of the history list: a day heading, or a movement inside that day's block.
// `isFirst` / `isLast` tell the row where its block starts and ends (rounded corners, divider).
export type HistoryItem =
  | { type: 'day'; key: string; date: LocalDate }
  | { type: 'movement'; key: string; movement: Movement; isFirst: boolean; isLast: boolean };

// The history comes newest first; a heading goes before the first movement of each day.
export function groupMovementsByDay(movements: readonly Movement[]): HistoryItem[] {
  const items: HistoryItem[] = [];
  movements.forEach((movement, index) => {
    const previous = movements[index - 1];
    const next = movements[index + 1];
    const isFirst = previous?.localDate !== movement.localDate;
    if (isFirst)
      items.push({ type: 'day', key: `day-${movement.localDate}`, date: movement.localDate });
    items.push({
      type: 'movement',
      key: movement.id,
      movement,
      isFirst,
      isLast: next?.localDate !== movement.localDate,
    });
  });

  return items;
}

// How the movement's money was split by category, for the colored band ("liga") of the row.
// Lines of the same category are added together; the order is the order of the lines.
export type BandSegment = { categoryId: string; amountMinor: number };

export function bandSegments(movement: Movement): BandSegment[] {
  const segments: BandSegment[] = [];
  for (const line of movement.lines) {
    const segment = segments.find((candidate) => candidate.categoryId === line.categoryId);
    if (segment) segment.amountMinor += line.amountMinor;
    else segments.push({ categoryId: line.categoryId, amountMinor: line.amountMinor });
  }

  return segments;
}

// The day heading: "today", "yesterday" or the date itself.
export type DayLabel =
  { kind: 'TODAY' } | { kind: 'YESTERDAY' } | { kind: 'DATE'; date: LocalDate };

export function dayLabel(date: LocalDate, today: LocalDate): DayLabel {
  if (date === today) return { kind: 'TODAY' };
  if (date === addDaysToLocalDate(today, -1)) return { kind: 'YESTERDAY' };
  return { kind: 'DATE', date };
}

// History of movements, one page at a time, with filters and totals per currency (RN-33).
// `refreshKey` changes when the screen regains focus, to start again from the first page.
export function useMovements(refreshKey = 0) {
  const repository = useMovementRepository();
  const [kind, setKind] = useState<MovementKind | undefined>(undefined);
  const [currency, setCurrency] = useState<CurrencyCode | undefined>(undefined);
  const [movements, setMovements] = useState<Movement[] | null>(null);
  const [totals, setTotals] = useState<CurrencyTotals[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Bumped to load again, e.g. after a delete.
  const [version, setVersion] = useState(0);

  // First page and totals: runs when the filters or the screen focus change.
  useEffect(() => {
    let active = true;
    const filter = { kind, currency };
    void Promise.all([
      // One extra row tells whether another page exists, without a second query.
      repository.list(filter, { limit: MOVEMENT_PAGE_SIZE + 1, offset: 0 }),
      repository.summarize(filter),
    ]).then(([rows, summary]) => {
      if (!active) return;
      setMovements(rows.slice(0, MOVEMENT_PAGE_SIZE));
      setHasMore(rows.length > MOVEMENT_PAGE_SIZE);
      setTotals(summary);
    });

    return () => {
      active = false;
    };
  }, [repository, kind, currency, version, refreshKey]);

  // Next page, when the list reaches its end.
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || movements === null) return;
    setIsLoadingMore(true);
    try {
      const rows = await repository.list(
        { kind, currency },
        { limit: MOVEMENT_PAGE_SIZE + 1, offset: movements.length },
      );
      setMovements([...movements, ...rows.slice(0, MOVEMENT_PAGE_SIZE)]);
      setHasMore(rows.length > MOVEMENT_PAGE_SIZE);
    } finally {
      setIsLoadingMore(false);
    }
  }, [repository, kind, currency, movements, hasMore, isLoadingMore]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return {
    isLoading: movements === null,
    movements: movements ?? [],
    items: groupMovementsByDay(movements ?? []), // the same movements, grouped by day for the list
    today: todayLocalDate(),
    totals, // RN-33: one row per currency, for the whole history that matches the filters
    hasMore,
    isLoadingMore,
    loadMore,
    kind,
    currency,
    setKind,
    setCurrency,
    reload,
  };
}
