import { StatusBar } from 'expo-status-bar';

import { useTheme } from './ThemeProvider';

// Light icons over the dark theme and dark icons over the light one, following the theme of the
// app (the user's choice in Settings), not only the phone's.
export function ThemedStatusBar() {
  const { scheme } = useTheme();

  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}
