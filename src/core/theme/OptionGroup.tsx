import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';

type Option<T extends string> = { value: T; label: string };

// A group of mutually exclusive choices (language, theme). Controlled by the parent.
// `compact` is for filters: one short row of chips that scrolls sideways, with the label kept
// only for screen readers, so it takes little height.
export function OptionGroup<T extends string>({
  label,
  options,
  selected,
  onSelect,
  disabled,
  compact,
}: {
  label: string;
  options: readonly Option<T>[];
  selected: T;
  onSelect: (value: T) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { colors } = useTheme();

  const chips = options.map((option) => {
    const isSelected = option.value === selected;

    return (
      <Pressable
        key={option.value}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
        disabled={disabled}
        onPress={() => onSelect(option.value)}
        style={[
          compact ? styles.chip : styles.option,
          {
            backgroundColor: isSelected ? colors.manila : colors.surface,
            borderColor: isSelected ? colors.manila : colors.line,
            opacity: disabled && !isSelected ? 0.4 : 1,
          },
        ]}
      >
        <AppText style={{ color: isSelected ? colors.onManila : colors.ink }}>
          {option.label}
        </AppText>
      </Pressable>
    );
  });

  if (compact) {
    return (
      <View accessibilityRole="radiogroup" accessibilityLabel={label}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {chips}
        </ScrollView>
      </View>
    );
  }

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
      <AppText variant="muted">{label}</AppText>
      <View style={styles.row}>{chips}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
  },
  option: {
    minHeight: 48,
    minWidth: 88,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
});
