import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { formatMoney, formatShortDate, joinWithAnd } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import { AppText } from '@/core/theme/AppText';
import { FLOATING_ACTION_SPACE } from '@/core/theme/FloatingAction';

import type { Category } from '../../categories/category.types';
import { useBudgets } from '../useBudgets';
import { EnvelopeGrid } from './EnvelopeGrid';

type Props = {
  refreshKey?: number;
  categories: readonly Category[];
  onOpen: (budgetId: string) => void;
};

// Home ("Tus sobres"): app name and today, the title, what is left per currency (never added
// across currencies, RN-33) and the open budgets (active or in grace) as envelopes.
export function OpenBudgetsOverview({ refreshKey, categories, onOpen }: Props) {
  const { t } = useTranslation();
  const { active, grace, summary, today, isLoading } = useBudgets(refreshKey);
  const language = getAppLanguage();
  if (isLoading) return null;

  const amounts = summary.map((entry) =>
    formatMoney({ amountMinor: entry.remainingMinor, currency: entry.currency }, language),
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <AppText variant="muted" weight="semibold" style={styles.small}>
          {t('home.header', {
            app: Constants.expoConfig?.name ?? '',
            date: formatShortDate(today, language),
          })}
        </AppText>
        <AppText variant="title">{t('home.title')}</AppText>
        <AppText variant="muted" style={styles.remaining}>
          {summary.length === 0
            ? t('budgets.summary.empty')
            : t('home.remaining', { amounts: joinWithAnd(amounts, t('common.and')) })}
        </AppText>
      </View>
      <EnvelopeGrid items={[...active, ...grace]} categories={categories} onOpen={onOpen} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: FLOATING_ACTION_SPACE },
  head: { gap: 2, paddingBottom: 4 },
  small: { fontSize: 13 },
  remaining: { fontSize: 15, marginTop: 2 },
});
