import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatLocalDate, formatMoney } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import { AppText } from '@/core/theme/AppText';
import { CategoryAvatar } from '@/core/theme/CategoryAvatar';
import { useTheme } from '@/core/theme/ThemeProvider';

import { getCategoryLabel } from '../../categories/category.rules';
import type { Category } from '../../categories/category.types';
import type { Budget, BudgetPhase } from '../budget.types';

type Props = {
  budget: Budget;
  category: Category | undefined;
  phase: BudgetPhase;
  onPress: () => void;
};

// One budget in the list: category, amount, dates and phase.
export function BudgetCard({ budget, category, phase, onPress }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = getAppLanguage();
  const label = category ? getCategoryLabel(category, t) : '';
  const amount = formatMoney(
    { amountMinor: budget.amountMinor, currency: budget.currency },
    language,
  );
  const period = t('budgets.period', {
    start: formatLocalDate(budget.startDate, language),
    end: formatLocalDate(budget.endDate, language),
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${amount}`}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}
    >
      <CategoryAvatar icon={category?.icon ?? ''} color={category?.color ?? colors.mute} />
      <View style={styles.text}>
        <AppText>{label}</AppText>
        <AppText variant="muted">{period}</AppText>
        <AppText variant="muted">{t(`budgets.phase.${phase}`)}</AppText>
      </View>
      <AppText style={styles.amount}>{amount}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 72,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: { flex: 1, gap: 2 },
  amount: { fontWeight: '700' },
});
