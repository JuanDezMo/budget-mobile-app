import { createRepositoryContext } from '@/core/shared/repository-context';

import type { BudgetRepository } from './budget.repository';

export const { RepositoryProvider: BudgetRepositoryProvider, useRepository: useBudgetRepository } =
  createRepositoryContext<BudgetRepository>('Budget');
