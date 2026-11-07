import { createRepositoryContext } from '@/core/shared/repository-context';

import type { CategoryRepository } from './category.repository';

export const {
  RepositoryProvider: CategoryRepositoryProvider,
  useRepository: useCategoryRepository,
} = createRepositoryContext<CategoryRepository>('Category');
