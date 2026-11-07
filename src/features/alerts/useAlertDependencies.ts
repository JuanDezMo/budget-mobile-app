import { createRepositoryContext } from '@/core/shared/repository-context';

import type { ThresholdRepository } from './alert.repository';

export const {
  RepositoryProvider: ThresholdRepositoryProvider,
  useRepository: useThresholdRepository,
} = createRepositoryContext<ThresholdRepository>('Threshold');

// Actions that need the rest of the app, so the composition root provides them.
export type AlertActions = {
  // After the user edits a budget's thresholds: brings the "already sent" records up to date
  // without notifying (a threshold the usage already passed must not alert out of the blue).
  syncAfterThresholdEdit(budgetId: string): Promise<void>;
};

export const { RepositoryProvider: AlertActionsProvider, useRepository: useAlertActions } =
  createRepositoryContext<AlertActions>('Alert actions');
