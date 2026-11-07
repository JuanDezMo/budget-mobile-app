import { err, ok } from '@/core/shared/result';
import type { Result } from '@/core/shared/result';

import { grantAccess, useAccessStore } from './useAccess';
import { changePinSchema, profileUpdateSchema } from './profile.schemas';
import type { ChangePinInput } from './profile.schemas';
import type { ProfileUpdate } from './profile.types';
import { usePinCheck } from './usePinCheck';
import type { PinCheckError } from './usePinCheck';
import { usePinVault, useProfileRepository } from './useProfileDependencies';

export type ProfileSettingsError = PinCheckError | 'INVALID' | 'UNEXPECTED';

// Edit profile and change PIN from Settings. Both ask for the current PIN (RN-47).
export function useProfileSettings(now: () => number = Date.now) {
  const repository = useProfileRepository();
  const vault = usePinVault();
  const { checkPin } = usePinCheck(now);
  const profile = useAccessStore((state) => state.profile);

  async function updateProfile(
    change: ProfileUpdate,
    currentPin: string,
  ): Promise<Result<void, ProfileSettingsError>> {
    const parsed = profileUpdateSchema.safeParse(change);
    if (!parsed.success) return err('INVALID');

    try {
      const check = await checkPin(currentPin);
      if (!check.ok) return check;
      grantAccess(await repository.update(parsed.data));

      return ok(undefined);
    } catch {
      return err('UNEXPECTED');
    }
  }

  async function changePin(input: ChangePinInput): Promise<Result<void, ProfileSettingsError>> {
    const parsed = changePinSchema.safeParse(input);
    if (!parsed.success) return err('INVALID');

    try {
      const check = await checkPin(parsed.data.currentPin);
      if (!check.ok) return check;
      await vault.setPin(parsed.data.newPin);

      return ok(undefined);
    } catch {
      return err('UNEXPECTED');
    }
  }

  return { profile, updateProfile, changePin };
}
