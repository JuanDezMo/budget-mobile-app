import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@/composition/AppProviders';
import { useAccessStore } from '@/features/profile/useAccess';

// The door of the app: each group of screens exists only in its access state.
// No profile -> register (RN-42). Profile but locked -> unlock (RN-44). Otherwise the app.
function RootNavigator() {
  const status = useAccessStore((state) => state.status);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'needsRegistration'}>
        <Stack.Screen name="register" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'locked'}>
        <Stack.Screen name="unlock" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'unlocked'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
      <StatusBar style="auto" />
    </AppProviders>
  );
}
