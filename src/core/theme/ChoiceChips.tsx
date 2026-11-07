import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';

type Option<T extends string> = { value: T; label: string };

// Small rounded choices that wrap onto several rows (payment methods in the sketches).
// One is selected, and it is dark.
export function ChoiceChips<T extends string>({
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
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.row}>
      {options.map((option) => {
        const isSelected = option.value === selected;
        const background = isSelected ? (dark ? colors.manila : colors.ink) : colors.surface;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            hitSlop={4}
            onPress={() => onSelect(option.value)}
            style={[
              styles.chip,
              { backgroundColor: background, borderColor: isSelected ? background : colors.line },
            ]}
          >
            <AppText
              weight="semibold"
              style={{
                fontSize: 13,
                color: isSelected ? (dark ? colors.onManila : colors.surface) : colors.ink,
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
  },
});
