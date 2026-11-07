// RN-45: failed PIN attempts survive app restarts, so closing the app does not skip the wait.
export type PinLockState = {
  failedAttempts: number;
  lockedUntilMs: number | null;
};
