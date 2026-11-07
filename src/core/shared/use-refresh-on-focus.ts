import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

// A number that goes up every time the screen comes back into focus (e.g. after closing a form).
// Pass it to a ViewModel so the list loads again instead of showing stale data.
export function useRefreshOnFocus(): number {
  const [refreshKey, setRefreshKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setRefreshKey((current) => current + 1);
    }, []),
  );

  return refreshKey;
}
