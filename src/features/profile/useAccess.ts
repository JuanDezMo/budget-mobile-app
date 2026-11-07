import { AppState } from 'react-native';
import { useEffect, useRef } from 'react';
import { create } from 'zustand';

import { shouldLockAfterBackground } from './profile.rules';
import type { ProfileRepository } from './profile.repository';
import type { AccessStatus, Profile } from './profile.types';

// Small global state: the root layout decides which screens exist from `status`.
type AccessStore = { status: AccessStatus; profile: Profile | null };

export const useAccessStore = create<AccessStore>(() => ({ status: 'loading', profile: null }));

// Startup. No profile -> registration (RN-42). With a profile the app always starts locked (RN-44).
export async function loadAccess(repository: ProfileRepository): Promise<void> {
  const profile = await repository.get();
  useAccessStore.setState({ profile, status: profile ? 'locked' : 'needsRegistration' });
}

export function grantAccess(profile: Profile): void {
  useAccessStore.setState({ profile, status: 'unlocked' });
}

export function lockApp(): void {
  if (useAccessStore.getState().status === 'unlocked')
    useAccessStore.setState({ status: 'locked' });
}

// RN-46: after erasing everything the user starts again at registration.
export function resetAccess(): void {
  useAccessStore.setState({ profile: null, status: 'needsRegistration' });
}

// RN-44: locks the app when it returns from the background after 30 seconds or more.
// `now` is injectable for tests.
export function useAppLock(now: () => number = Date.now): void {
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundedAt.current = now();
      } else if (state === 'active' && backgroundedAt.current !== null) {
        if (shouldLockAfterBackground(backgroundedAt.current, now())) lockApp();
        backgroundedAt.current = null;
      }
    });

    return () => subscription.remove();
  }, [now]);
}
