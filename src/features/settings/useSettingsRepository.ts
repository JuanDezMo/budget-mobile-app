import { createRepositoryContext } from '@/core/shared/repository-context';

import type { SettingsRepository } from './settings.repository';

export const {
  RepositoryProvider: SettingsRepositoryProvider,
  useRepository: useSettingsRepository,
} = createRepositoryContext<SettingsRepository>('Settings');
