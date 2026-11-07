import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  // primary: manila, the brand color. ink: the dark call to action (saving a movement); manila
  // with dark text in dark mode. danger: destructive actions.
  tone?: 'primary' | 'ink' | 'danger';
};

export function PrimaryButton({ label, onPress, disabled, tone = 'primary' }: Props) {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const background =
    tone === 'danger'
      ? colors.over
      : tone === 'ink'
        ? dark
          ? colors.manila
          : colors.ink
        : colors.manila;
  const text =
    tone === 'danger'
      ? colors.surface
      : tone === 'ink'
        ? dark
          ? colors.onManila
          : colors.surface
        : colors.onManila;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        tone === 'ink' && styles.ink,
        { backgroundColor: background, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      <AppText weight="bold" style={[{ color: text }, tone === 'ink' && styles.inkText]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ink: { minHeight: 56, borderRadius: 16 },
  inkText: { fontSize: 17 },
});
