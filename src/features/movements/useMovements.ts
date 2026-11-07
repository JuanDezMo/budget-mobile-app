import { useCallback, useEffect, useState } from 'react';

import type { CurrencyCode } from '@/core/shared/currency';

import { MOVEMENT_PAGE_SIZE } from './movement.types';
import type { CurrencyTotals, Movement, MovementKind } from './movement.types';
import { useMovementRepository } from './useMovementRepository';

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
