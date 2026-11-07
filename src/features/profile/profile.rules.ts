import type { PinLockState } from '@/core/shared/pin-lock-state';

// RN-45: after 5 wrong PINs in a row the app makes you wait: 30 s, then 1 min, 2 min...
// doubling up to 15 minutes. A correct PIN resets the counter.
export const MAX_FREE_ATTEMPTS = 5;
export const FIRST_LOCK_SECONDS = 30;
export const MAX_LOCK_SECONDS = 15 * 60;

// RN-44: the app asks for the PIN again after 30 seconds in the background.
export const BACKGROUND_LOCK_SECONDS = 30;

export const INITIAL_PIN_LOCK_STATE: PinLockState = { failedAttempts: 0, lockedUntilMs: null };

// Seconds the user still has to wait, 0 when they can try (RN-45).
export function lockRemainingSeconds(state: PinLockState, nowMs: number): number {
  if (state.lockedUntilMs === null) return 0;
  return Math.max(0, Math.ceil((state.lockedUntilMs - nowMs) / 1000));
}

// State after one PIN attempt (RN-45).
export function registerPinAttempt(
  state: PinLockState,
  success: boolean,
  nowMs: number,
): PinLockState {
  if (success) return INITIAL_PIN_LOCK_STATE;

  const failedAttempts = state.failedAttempts + 1;
  if (failedAttempts < MAX_FREE_ATTEMPTS) return { failedAttempts, lockedUntilMs: null };

  const seconds = Math.min(
    FIRST_LOCK_SECONDS * 2 ** (failedAttempts - MAX_FREE_ATTEMPTS),
    MAX_LOCK_SECONDS,
  );

  return { failedAttempts, lockedUntilMs: nowMs + seconds * 1000 };
}

// RN-44: lock when coming back after at least 30 seconds away.
export function shouldLockAfterBackground(backgroundedAtMs: number, nowMs: number): boolean {
  return nowMs - backgroundedAtMs >= BACKGROUND_LOCK_SECONDS * 1000;
}
