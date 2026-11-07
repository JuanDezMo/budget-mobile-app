import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import type { ThemeMode } from '@/core/shared/app-preferences';

import { colorsByScheme, resolveScheme } from './tokens';
import type { ResolvedScheme, ThemeColors } from './tokens';

type Theme = { mode: ThemeMode; scheme: ResolvedScheme; colors: ThemeColors };

const ThemeContext = createContext<Theme>({
  mode: 'SYSTEM',
  scheme: 'light',
  colors: colorsByScheme.light,
});

// `mode` comes from the saved settings (RN-37); the provider only resolves it to colors.
export function ThemeProvider({ mode, children }: { mode: ThemeMode; children: ReactNode }) {
  const systemScheme = useColorScheme();
  const scheme = resolveScheme(mode, systemScheme);
  const value = useMemo<Theme>(
    () => ({ mode, scheme, colors: colorsByScheme[scheme] }),
    [mode, scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
