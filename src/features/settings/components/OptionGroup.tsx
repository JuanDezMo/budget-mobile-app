import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { useTheme } from '@/core/theme/ThemeProvider';

type Option<T extends string> = { value: T; label: string };

// A group of mutually exclusive choices (language, theme). Controlled by the parent.
export function OptionGroup<T extends string>({
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
  const { colors } = useTheme();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
      <AppText variant="muted">{label}</AppText>
      <View style={styles.row}>
        {options.map((option) => {
          const isSelected = option.value === selected;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(option.value)}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected ? colors.manila : colors.surface,
                  borderColor: isSelected ? colors.manila : colors.line,
                },
              ]}
            >
              <AppText style={{ color: isSelected ? colors.onManila : colors.ink }}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
