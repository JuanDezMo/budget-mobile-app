import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';

type Option<T extends string> = { value: T; label: string };

// Two or three exclusive choices side by side in one rounded box (Expense / Refund / Income in
// the sketches). The selected one is dark.
export function SegmentedControl<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly Option<T>[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.line }]}
    >
      {options.map((option) => {
        const isSelected = option.value === selected;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(option.value)}
            style={[
              styles.segment,
              isSelected && { backgroundColor: dark ? colors.manila : colors.ink },
            ]}
          >
            <AppText
              weight="semibold"
              style={{
                color: isSelected ? (dark ? colors.onManila : colors.surface) : colors.mute,
                fontSize: 14,
              }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 3 },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
