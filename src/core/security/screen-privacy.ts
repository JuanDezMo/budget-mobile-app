import {
  allowScreenCaptureAsync,
  disableAppSwitcherProtectionAsync,
  enableAppSwitcherProtectionAsync,
  preventScreenCaptureAsync,
} from 'expo-screen-capture';
import { useEffect } from 'react';
import { Platform } from 'react-native';

// Hides balances where the system shows the app outside its own screen (RN-44):
// - Android: blank preview in recent apps, and screenshots are blocked.
// - iOS: the preview is blurred (there is no way to block screenshots there).
// Only in release builds: while developing we need screenshots to debug the screens.
// Failures are ignored on purpose: privacy hardening must never stop the app from opening.
export function useScreenPrivacy(): void {
  useEffect(() => {
    if (__DEV__) return;

    if (Platform.OS === 'android') {
      void preventScreenCaptureAsync().catch(() => undefined);
      return () => void allowScreenCaptureAsync().catch(() => undefined);
    }

    void enableAppSwitcherProtectionAsync().catch(() => undefined);
    return () => void disableAppSwitcherProtectionAsync().catch(() => undefined);
  }, []);
}
