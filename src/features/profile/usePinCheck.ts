import { err, ok } from '@/core/shared/result';
import type { Result } from '@/core/shared/result';

import { lockRemainingSeconds, registerPinAttempt } from './profile.rules';
import { usePinVault } from './useProfileDependencies';

export type PinCheckError = 'PIN_WRONG' | 'PIN_LOCKED';

// Checks a PIN and keeps the failed-attempt counter (RN-45). Every place that asks for the
// current PIN (unlock, edit profile, change PIN) goes through here, so the wait applies everywhere.
export function usePinCheck(now: () => number = Date.now) {
  const vault = usePinVault();

  async function checkPin(pin: string): Promise<Result<void, PinCheckError>> {
    const state = await vault.readLockState();
    if (lockRemainingSeconds(state, now()) > 0) return err('PIN_LOCKED');

    const correct = await vault.verifyPin(pin);
    const next = registerPinAttempt(state, correct, now());
    await vault.writeLockState(next);
    if (correct) return ok(undefined);

    return lockRemainingSeconds(next, now()) > 0 ? err('PIN_LOCKED') : err('PIN_WRONG');
  }

  return { checkPin };
}
