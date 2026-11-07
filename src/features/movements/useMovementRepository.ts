import { createRepositoryContext } from '@/core/shared/repository-context';

import type { MovementRepository } from './movement.repository';

export const {
  RepositoryProvider: MovementRepositoryProvider,
  useRepository: useMovementRepository,
} = createRepositoryContext<MovementRepository>('Movement');
