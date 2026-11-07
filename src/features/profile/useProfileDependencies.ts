import type { PinVault } from '@/core/security/pin-vault';
import { createRepositoryContext } from '@/core/shared/repository-context';

import type { ProfileRepository } from './profile.repository';

export const {
  RepositoryProvider: ProfileRepositoryProvider,
  useRepository: useProfileRepository,
} = createRepositoryContext<ProfileRepository>('Profile');

export const { RepositoryProvider: PinVaultProvider, useRepository: usePinVault } =
  createRepositoryContext<PinVault>('PIN vault');
