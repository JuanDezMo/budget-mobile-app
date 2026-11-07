import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { PrimaryButton } from './PrimaryButton';
import { useTheme } from './ThemeProvider';

// Main action of a screen, pinned to the bottom so it is always in reach of the thumb.
// Lists leave room for it at their end (`FLOATING_ACTION_SPACE`).
export const FLOATING_ACTION_SPACE = 96;

type Props = {
  label: string;
  onPress: () => void;
  // "wide": a full-width button (lists). "pill": the floating "+ Add expense" of the home,
  // bottom right, in the dark CTA color of the visual direction.
  variant?: 'wide' | 'pill';
};

export function FloatingAction({ label, onPress, variant = 'wide' }: Props) {
  const { colors, scheme } = useTheme();

  if (variant === 'pill') {
    // CTA ink on white in light mode; manila with dark text in dark mode (src-app.md).
    const background = scheme === 'dark' ? colors.manila : colors.ink;
    const text = scheme === 'dark' ? colors.onManila : colors.surface;

    return (
      <View pointerEvents="box-none" style={styles.pillWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onPress}
          style={[styles.pill, { backgroundColor: background }]}
        >
          <AppText weight="bold" style={{ color: text }}>
            {`＋ ${label}`}
          </AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={styles.wide}>
      <PrimaryButton label={label} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  wide: { position: 'absolute', left: 0, right: 0, bottom: 16 },
  pillWrap: { position: 'absolute', right: 0, bottom: 16 },
  pill: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20 },
});
