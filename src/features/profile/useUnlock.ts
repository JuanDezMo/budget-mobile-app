import { useEffect, useState } from 'react';

import { err, ok } from '@/core/shared/result';
import type { Result } from '@/core/shared/result';

import { lockRemainingSeconds } from './profile.rules';
import { grantAccess, resetAccess, useAccessStore } from './useAccess';
import { usePinCheck } from './usePinCheck';
import type { PinCheckError } from './usePinCheck';
import { usePinVault, useProfileRepository } from './useProfileDependencies';

// Lock screen (RN-44, RN-45, RN-46).
export function useUnlock(now: () => number = Date.now) {
  const repository = useProfileRepository();
  const vault = usePinVault();
  const { checkPin } = usePinCheck(now);
  const [lockedUntilMs, setLockedUntilMs] = useState<number | null>(null);
  const [clock, setClock] = useState(now);

  // RN-45: the wait left is shown also after reopening the app, and counts down.
  useEffect(() => {
    let active = true;
    void vault.readLockState().then((state) => {
      if (!active) return;
      setLockedUntilMs(state.lockedUntilMs);
      setClock(now());
    });

    return () => {
      active = false;
    };
  }, [vault, now]);

  useEffect(() => {
    if (lockedUntilMs === null || clock >= lockedUntilMs) return;
    const timer = setInterval(() => setClock(now()), 1000);

    return () => clearInterval(timer);
  }, [lockedUntilMs, clock, now]);

  const waitSeconds = lockRemainingSeconds({ failedAttempts: 0, lockedUntilMs }, clock);

  async function refreshWait() {
    const state = await vault.readLockState();
    setLockedUntilMs(state.lockedUntilMs);
    setClock(now());
  }

  async function unlock(pin: string): Promise<Result<void, PinCheckError | 'UNEXPECTED'>> {
    try {
      const result = await checkPin(pin);
      await refreshWait();
      if (!result.ok) return result;

      const profile = useAccessStore.getState().profile;
      if (profile) grantAccess(profile);

      return ok(undefined);
    } catch {
      return err('UNEXPECTED');
    }
  }

  // RN-46: "Forgot my PIN" erases all the data and starts over at registration.
  async function eraseEverything(): Promise<Result<void, 'UNEXPECTED'>> {
    try {
      await repository.eraseAllData();
      await vault.clear();
      resetAccess();

      return ok(undefined);
    } catch {
      return err('UNEXPECTED');
    }
  }

  return { unlock, eraseEverything, waitSeconds };
}
