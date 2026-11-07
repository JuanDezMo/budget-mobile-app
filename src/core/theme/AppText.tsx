import { StyleSheet, Text } from 'react-native';
import type { TextProps } from 'react-native';

import { useTheme } from './ThemeProvider';

type Variant = 'title' | 'body' | 'muted';

// Themed text. Colors always come from the theme tokens.
export function AppText({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  const { colors } = useTheme();
  const color = variant === 'muted' ? colors.mute : colors.ink;

  return <Text {...rest} style={[styles[variant], { color }, style]} />;
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800' },
  body: { fontSize: 16 },
  muted: { fontSize: 14 },
});
