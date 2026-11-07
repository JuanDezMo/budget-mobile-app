import { StyleSheet, Text } from 'react-native';
import type { TextProps } from 'react-native';

import { useTheme } from './ThemeProvider';
import { CONDENSED_FAMILY, FONT_FAMILY } from './typography';
import type { TextWeight } from './typography';

type Variant = 'title' | 'body' | 'muted';

type Props = TextProps & {
  variant?: Variant;
  // Overrides the weight of the variant (title is extra bold, body and muted regular).
  weight?: TextWeight;
  // Big amounts: condensed face (so they fit in a small card) and tabular figures.
  condensed?: boolean;
};

const DEFAULT_WEIGHT: Record<Variant, TextWeight> = {
  title: 'extrabold',
  body: 'regular',
  muted: 'regular',
};

// Themed text. Colors always come from the theme tokens; figures are always tabular.
export function AppText({ variant = 'body', weight, condensed, style, ...rest }: Props) {
  const { colors } = useTheme();
  const color = variant === 'muted' ? colors.mute : colors.ink;
  const fontFamily = condensed ? CONDENSED_FAMILY : FONT_FAMILY[weight ?? DEFAULT_WEIGHT[variant]];

  return (
    <Text
      {...rest}
      style={[styles[variant], { color, fontFamily, fontVariant: ['tabular-nums'] }, style]}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30 },
  body: { fontSize: 16 },
  muted: { fontSize: 14 },
});
