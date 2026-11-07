import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'danger';
};

// Main action button. Manila is the brand color; danger is for destructive actions.
export function PrimaryButton({ label, onPress, disabled, tone = 'primary' }: Props) {
  const { colors } = useTheme();
  const background = tone === 'danger' ? colors.over : colors.manila;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, { backgroundColor: background, opacity: disabled ? 0.5 : 1 }]}
    >
      <AppText
        style={{ color: tone === 'danger' ? colors.surface : colors.onManila, fontWeight: '700' }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
