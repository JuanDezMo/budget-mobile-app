import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatMoney } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import { AppText } from '@/core/theme/AppText';
import { iconToEmoji } from '@/core/theme/category-icons';
import { useTheme } from '@/core/theme/ThemeProvider';

import { getCategoryLabel } from '../../categories/category.rules';
import type { Category } from '../../categories/category.types';
import type { Movement } from '../movement.types';
import { bandSegments } from '../useMovements';

type Props = {
  movement: Movement;
  categories: readonly Category[];
  isFirst: boolean; // first row of its day: rounded top
  isLast: boolean; // last row of its day: rounded bottom, no divider
  onOpen: (movementId: string) => void;
};

// One movement of the history, drawn like the rows of the envelope detail. On the left, the band
// ("liga") in the color of its category; a split movement splits the band by what each category got.
export function MovementRow({ movement, categories, isFirst, isLast, onOpen }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = getAppLanguage();
  const segments = bandSegments(movement);
  const categoryOf = (id: string) => categories.find((candidate) => candidate.id === id);
  // The icon is the one of the category that took the biggest part.
  const main = [...segments].sort((a, b) => b.amountMinor - a.amountMinor)[0];
  const mainCategory = main ? categoryOf(main.categoryId) : undefined;
  const names = segments
    .map((segment) => {
      const category = categoryOf(segment.categoryId);
      return category ? getCategoryLabel(category, t) : '';
    })
    .filter((name) => name !== '')
    .join(', ');
  const kind = t(`movements.kind.${movement.kind}`);
  const payment = t(`movements.payment.${movement.paymentMethod}`);
  const amount = formatMoney(
    { amountMinor: movement.totalMinor, currency: movement.currency },
    language,
  );
  const sign = movement.kind === 'EXPENSE' ? '−' : '+';
  const isSplit = segments.length > 1;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[`${kind} ${amount}`, movement.note, names, payment]
        .filter((part) => part !== null && part !== '')
        .join(', ')}
      onPress={() => onOpen(movement.id)}
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderBottomColor: colors.line },
        isFirst && styles.first,
        isLast && styles.last,
      ]}
    >
      <View style={styles.band} testID={`band-${movement.id}`}>
        {segments.map((segment) => (
          <View
            key={segment.categoryId}
            testID={`band-segment-${movement.id}`}
            style={{
              flex: segment.amountMinor,
              backgroundColor: categoryOf(segment.categoryId)?.color ?? colors.line,
            }}
          />
        ))}
      </View>
      <View style={[styles.icon, { backgroundColor: colors.ground }]}>
        <AppText weight="bold">{iconToEmoji(mainCategory?.icon ?? '')}</AppText>
      </View>
      <View style={styles.text}>
        <AppText numberOfLines={1}>{movement.note ?? kind}</AppText>
        {/* Payment first: a long list of categories is cut at the end, the payment never is. */}
        <AppText variant="muted" numberOfLines={1} style={styles.small}>
          {payment} · {names}
        </AppText>
      </View>
      <View style={styles.amount}>
        <AppText
          weight="bold"
          style={{ color: movement.kind === 'EXPENSE' ? colors.ink : colors.positive }}
        >
          {sign}
          {amount}
        </AppText>
        {isSplit ? (
          <View style={[styles.split, { borderColor: colors.line }]}>
            <AppText variant="muted" weight="bold" style={styles.splitText}>
              {t('movements.history.parts', { count: segments.length })}
            </AppText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const RADIUS = 12;

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    paddingVertical: 11,
    paddingLeft: 22, // room for the band
    paddingRight: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  first: { borderTopLeftRadius: RADIUS, borderTopRightRadius: RADIUS },
  last: { borderBottomLeftRadius: RADIUS, borderBottomRightRadius: RADIUS, borderBottomWidth: 0 },
  band: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 1 },
  small: { fontSize: 12 },
  amount: { alignItems: 'flex-end', gap: 2 },
  split: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 5 },
  splitText: { fontSize: 11 },
});
