import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from './ThemeProvider';

// Base of every screen: themed background and safe areas (notch, status bar).
// `topInset={false}` for screens under a stack header: the header already covers the status bar.
export function Screen({ children, topInset = true }: { children: ReactNode; topInset?: boolean }) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      edges={topInset ? ['top', 'bottom', 'left', 'right'] : ['bottom', 'left', 'right']}
      style={[styles.screen, { backgroundColor: colors.ground }]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
});
