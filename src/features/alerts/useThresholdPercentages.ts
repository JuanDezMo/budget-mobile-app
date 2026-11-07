import { useEffect, useState } from 'react';

import { useThresholdRepository } from './useAlertDependencies';

// The alert percentages of every budget, for drawing them on the envelopes. `refreshKey` changes
// when the screen regains focus, to load again.
export function useThresholdPercentages(refreshKey = 0): Record<string, number[]> {
  const repository = useThresholdRepository();
  const [percentages, setPercentages] = useState<Record<string, number[]>>({});

  useEffect(() => {
    let active = true;
    void repository.listPercentagesByBudget().then((loaded) => {
      if (active) setPercentages(loaded);
    });

    return () => {
      active = false;
    };
  }, [repository, refreshKey]);

  return percentages;
}
