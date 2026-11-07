import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { formatLocalDate, formatMoney } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import { CURRENCY_CODES } from '@/core/shared/currency';
import type { CurrencyCode } from '@/core/shared/currency';
import { AppText } from '@/core/theme/AppText';
import { OptionGroup } from '@/core/theme/OptionGroup';
import { FLOATING_ACTION_SPACE, FloatingAction } from '@/core/theme/FloatingAction';
import { useTheme } from '@/core/theme/ThemeProvider';

import { getCategoryLabel } from '../../categories/category.rules';
import type { Category } from '../../categories/category.types';
import { MOVEMENT_KINDS } from '../movement.types';
import type { Movement, MovementKind } from '../movement.types';
import { useMovements } from '../useMovements';

type Props = {
  refreshKey?: number; // changes when the screen regains focus, to load again
  categories: readonly Category[];
  onCreate: () => void;
  onOpen: (movementId: string) => void;
};

// Columns of the totals card, in the order they are shown.
const TOTAL_KEYS = ['expense', 'refund', 'income'] as const;

const ALL = 'ALL';
type KindChoice = MovementKind | typeof ALL;
type CurrencyChoice = CurrencyCode | typeof ALL;

// History of movements with filters and totals per currency (RN-33).
export function MovementList({ refreshKey, categories, onCreate, onOpen }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const {
    movements,
    totals,
    kind,
    currency,
    setKind,
    setCurrency,
    isLoading,
    loadMore,
    isLoadingMore,
  } = useMovements(refreshKey);
  const language = getAppLanguage();
  if (isLoading) return null;

  const categoryNames = (movement: Movement) =>
    [
      ...new Set(
        movement.lines.map((line) => {
          const category = categories.find((candidate) => candidate.id === line.categoryId);
          return category ? getCategoryLabel(category, t) : '';
        }),
      ),
    ].join(', ');

  const header = (
    <View style={styles.header}>
      <OptionGroup<KindChoice>
        compact
        label={t('movements.sectionKind')}
        options={[
          { value: ALL, label: t('movements.filterAll') },
          ...MOVEMENT_KINDS.map((value) => ({ value, label: t(`movements.kind.${value}`) })),
        ]}
        selected={kind ?? ALL}
        onSelect={(value) => setKind(value === ALL ? undefined : value)}
      />
      <OptionGroup<CurrencyChoice>
        compact
        label={t('movements.sectionCurrency')}
        options={[
          { value: ALL, label: t('movements.filterAll') },
          ...CURRENCY_CODES.map((value) => ({ value, label: value })),
        ]}
        selected={currency ?? ALL}
        onSelect={(value) => setCurrency(value === ALL ? undefined : value)}
      />
      {totals.map((total) => (
        <View
          key={total.currency}
          accessibilityLabel={`${total.currency} ${t('movements.totalsTitle')}`}
          style={[styles.totals, { backgroundColor: colors.surface, borderColor: colors.line }]}
        >
          <AppText style={styles.currency}>{total.currency}</AppText>
          {TOTAL_KEYS.map((key) => (
            <View key={key} style={styles.totalColumn}>
              <AppText variant="muted">{t(`movements.totals.${key}`)}</AppText>
              <AppText>
                {formatMoney({ amountMinor: total[key], currency: total.currency }, language)}
              </AppText>
            </View>
          ))}
        </View>
      ))}
      {movements.length === 0 ? <AppText variant="muted">{t('movements.empty')}</AppText> : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlashList
        data={movements}
        keyExtractor={(movement) => movement.id}
        ListHeaderComponent={header}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator accessibilityLabel={t('common.loading')} color={colors.mute} />
          ) : null
        }
        contentContainerStyle={styles.content}
        renderItem={({ item }) => {
          const amount = formatMoney(
            { amountMinor: item.totalMinor, currency: item.currency },
            language,
          );

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t(`movements.kind.${item.kind}`)} ${amount}`}
              onPress={() => onOpen(item.id)}
              style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]}
            >
              <View style={styles.rowText}>
                <AppText>{t(`movements.kind.${item.kind}`)}</AppText>
                <AppText variant="muted">{categoryNames(item)}</AppText>
                <AppText variant="muted">
                  {formatLocalDate(item.localDate, language)} ·{' '}
                  {t(`movements.payment.${item.paymentMethod}`)}
                </AppText>
              </View>
              <AppText
                style={[
                  styles.amount,
                  { color: item.kind === 'EXPENSE' ? colors.ink : colors.positive },
                ]}
              >
                {item.kind === 'EXPENSE' ? '−' : '+'}
                {amount}
              </AppText>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      <FloatingAction label={t('movements.new')} onPress={onCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: FLOATING_ACTION_SPACE },
  header: { gap: 8, paddingBottom: 12 },
  totals: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currency: { fontWeight: '700' },
  totalColumn: { flex: 1 },
  row: {
    minHeight: 72,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: { flex: 1, gap: 2 },
  amount: { fontWeight: '700' },
  separator: { height: 8 },
});
