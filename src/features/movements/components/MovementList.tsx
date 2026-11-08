import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { formatLocalDate, formatMoney, formatShortDate } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import { CURRENCY_CODES } from '@/core/shared/currency';
import type { CurrencyCode } from '@/core/shared/currency';
import type { LocalDate } from '@/core/shared/dates';
import { AppText } from '@/core/theme/AppText';
import { OptionGroup } from '@/core/theme/OptionGroup';
import { FLOATING_ACTION_SPACE, FloatingAction } from '@/core/theme/FloatingAction';
import { SectionHeading } from '@/core/theme/SectionHeading';
import { useTheme } from '@/core/theme/ThemeProvider';

import type { Category } from '../../categories/category.types';
import { MOVEMENT_KINDS } from '../movement.types';
import type { CurrencyTotals, MovementKind } from '../movement.types';
import { dayLabel, useMovements } from '../useMovements';
import { MovementRow } from './MovementRow';

type Props = {
  refreshKey?: number; // changes when the screen regains focus, to load again
  categories: readonly Category[];
  onCreate: () => void;
  onOpen: (movementId: string) => void;
};

// Parts of each totals line, in the order they are shown (a part at zero is left out).
const TOTAL_KEYS = ['expense', 'refund', 'income'] as const;

const ALL = 'ALL';
type KindChoice = MovementKind | typeof ALL;
type CurrencyChoice = CurrencyCode | typeof ALL;

// History of movements: title, totals per currency in one line each (RN-33, never added across
// currencies), filters, and the movements grouped by day in one block per day.
export function MovementList({ refreshKey, categories, onCreate, onOpen }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const {
    items,
    today,
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

  const totalsLine = (total: CurrencyTotals) => {
    const parts = TOTAL_KEYS.filter((key) => total[key] > 0).map(
      (key) =>
        `${t(`movements.totals.${key}`)} ${formatMoney({ amountMinor: total[key], currency: total.currency }, language)}`,
    );
    return parts.join(' · ');
  };

  const dayText = (date: LocalDate) => {
    const label = dayLabel(date, today);
    switch (label.kind) {
      case 'TODAY':
        return t('movements.form.today');
      case 'YESTERDAY':
        return t('movements.form.yesterday');
      case 'DATE':
        // Another year needs the year; this one does not.
        return label.date.slice(0, 4) === today.slice(0, 4)
          ? formatShortDate(label.date, language)
          : formatLocalDate(label.date, language);
    }
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.head}>
        <AppText variant="title">{t('navigation.movements')}</AppText>
        {totals.map((total) => (
          <AppText
            key={total.currency}
            accessibilityLabel={`${total.currency} ${t('movements.totalsTitle')}`}
            variant="muted"
            style={styles.totals}
          >
            {totalsLine(total)}
          </AppText>
        ))}
      </View>
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
      {items.length === 0 ? <AppText variant="muted">{t('movements.empty')}</AppText> : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlashList
        data={items}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
        ListHeaderComponent={header}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator accessibilityLabel={t('common.loading')} color={colors.mute} />
          ) : null
        }
        contentContainerStyle={styles.content}
        renderItem={({ item }) =>
          item.type === 'day' ? (
            <SectionHeading title={dayText(item.date)} style={styles.day} />
          ) : (
            <MovementRow
              movement={item.movement}
              categories={categories}
              isFirst={item.isFirst}
              isLast={item.isLast}
              onOpen={onOpen}
            />
          )
        }
      />
      <FloatingAction label={t('movements.new')} onPress={onCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: FLOATING_ACTION_SPACE },
  header: { gap: 8, paddingBottom: 4 },
  head: { gap: 2, paddingBottom: 4 },
  totals: { fontSize: 15 },
  day: { paddingTop: 16, paddingBottom: 8 },
});
