import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { formatMoney } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import { AppText } from '@/core/theme/AppText';
import { useTheme } from '@/core/theme/ThemeProvider';

import type { Category } from '../../categories/category.types';
import { useBudgets } from '../useBudgets';
import { BudgetCard } from './BudgetCard';

type Props = {
  refreshKey?: number;
  categories: readonly Category[];
  onOpen: (budgetId: string) => void;
};

// Home: how much is left to spend per currency (never added across currencies, RN-33) and the
// open budgets (active or in grace) with how much of each is used.
export function OpenBudgetsOverview({ refreshKey, categories, onOpen }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { active, grace, summary, isLoading } = useBudgets(refreshKey);
  const language = getAppLanguage();
  if (isLoading) return null;

  const open = [...active, ...grace];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {summary.length === 0 ? (
        <AppText variant="muted">{t('budgets.summary.empty')}</AppText>
      ) : null}
      {summary.map((entry) => {
        const money = (amountMinor: number) =>
          formatMoney({ amountMinor, currency: entry.currency }, language);

        return (
          <View
            key={entry.currency}
            accessibilityLabel={`${entry.currency} ${t('budgets.summary.title')}`}
            style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <AppText variant="muted">{t('budgets.summary.title')}</AppText>
            <AppText
              variant="title"
              style={{ color: entry.remainingMinor < 0 ? colors.over : colors.ink }}
            >
              {money(entry.remainingMinor)}
            </AppText>
            <AppText variant="muted">
              {t('budgets.summary.spentOf', {
                spent: money(entry.spentMinor),
                available: money(entry.availableMinor),
              })}
            </AppText>
          </View>
        );
      })}
      {open.map((item) => (
        <Fragment key={item.budget.id}>
          <BudgetCard
            item={item}
            category={categories.find((category) => category.id === item.budget.categoryId)}
            onPress={() => onOpen(item.budget.id)}
          />
        </Fragment>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 10, paddingBottom: 32 },
  summary: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 4 },
});
