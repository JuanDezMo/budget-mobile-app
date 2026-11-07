import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { CategoryAvatar } from '@/core/theme/CategoryAvatar';
import { useTheme } from '@/core/theme/ThemeProvider';
import { FONT_FAMILY } from '@/core/theme/typography';

import { getCategoryLabel } from '../../categories/category.rules';
import type { Category } from '../../categories/category.types';

// A symbol, not text: its meaning is in the accessibility label of the button.
const REMOVE_SYMBOL = '✕';

type Props = {
  position: number; // 1, 2, 3... for the accessibility labels
  category: Category | undefined;
  categories: readonly Category[]; // the ones that can be chosen (RN-36)
  amount: string;
  onChangeAmount: (text: string) => void;
  onBlurAmount: () => void;
  onSelectCategory: (categoryId: string) => void;
  onRemove?: () => void; // only when there is more than one line
  error?: string;
  placeholder?: string; // what the amount will be if left empty
  // "Counts for: ..." under the category (RN-17); the form decides what it says.
  children?: ReactNode;
};

// One line of the split (sketch 3): the band with the color of its category, the category name
// with where it counts, and its amount. Pressing the name opens the list of categories.
export function LineRow({
  position,
  category,
  categories,
  amount,
  onChangeAmount,
  onBlurAmount,
  onSelectCategory,
  onRemove,
  error,
  placeholder = '0',
  children,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [choosing, setChoosing] = useState(false);
  const label = category ? getCategoryLabel(category, t) : '';

  return (
    <View style={[styles.line, { borderBottomColor: colors.line }]}>
      <View style={styles.main}>
        <View style={[styles.band, { backgroundColor: category?.color ?? colors.line }]} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('movements.form.chooseCategory')} ${position}`}
          onPress={() => setChoosing((open) => !open)}
          style={styles.title}
        >
          <AppText weight="bold" numberOfLines={1}>
            {label}
          </AppText>
          {children}
        </Pressable>
        <TextInput
          accessibilityLabel={`${t('movements.form.lineAmount')} ${position}`}
          value={amount}
          onChangeText={onChangeAmount}
          onBlur={onBlurAmount}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.mute}
          style={[styles.amount, { color: colors.ink, fontFamily: FONT_FAMILY.bold }]}
        />
        {onRemove ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('movements.form.removeLine')} ${position}`}
            onPress={onRemove}
            style={styles.remove}
          >
            <AppText style={{ color: colors.over }}>{REMOVE_SYMBOL}</AppText>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="muted" style={{ color: colors.over }}>
          {error}
        </AppText>
      ) : null}
      {choosing ? (
        <View style={styles.chips} accessibilityRole="radiogroup">
          {categories.map((candidate) => {
            const candidateLabel = getCategoryLabel(candidate, t);
            const selected = candidate.id === category?.id;

            return (
              <Pressable
                key={candidate.id}
                accessibilityRole="radio"
                accessibilityLabel={`${t('movements.form.category')} ${position}: ${candidateLabel}`}
                accessibilityState={{ selected }}
                onPress={() => {
                  onSelectCategory(candidate.id);
                  setChoosing(false);
                }}
                style={[
                  styles.chip,
                  {
                    borderColor: selected ? colors.ink : colors.line,
                    backgroundColor: colors.ground,
                  },
                ]}
              >
                <CategoryAvatar icon={candidate.icon} color={candidate.color} size={28} />
                <AppText variant="muted" style={{ color: colors.ink }}>
                  {candidateLabel}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, gap: 8 },
  main: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  band: { width: 8, height: 36, borderRadius: 3 },
  title: { flex: 1, minHeight: 44, justifyContent: 'center', gap: 2 },
  amount: {
    minWidth: 96,
    minHeight: 44,
    textAlign: 'right',
    fontSize: 17,
    fontVariant: ['tabular-nums'],
  },
  remove: { minHeight: 44, minWidth: 36, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
