import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { formatMoney, formatPercentage } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import type { CurrencyCode } from '@/core/shared/currency';
import { AppText } from '@/core/theme/AppText';
import { useTheme } from '@/core/theme/ThemeProvider';

import { barFillPercentage } from '../budget-usage.rules';
import type { BudgetUsage, UsageState } from '../budget.types';

type Props = { usage: BudgetUsage; state: UsageState; currency: CurrencyCode };

// How much of a budget is used: a bar, the spent / available amounts and what is left.
// Exceeded (RN-29) is shown with the "over" color on the border and the text, not a red fill;
// a closed budget with money left shows it as saved (RN-09).
export function UsageBar({ usage, state, currency }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = getAppLanguage();
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency }, language);
  const percent = formatPercentage(usage.percentage, language);
  const exceeded = state === 'EXCEEDED';

  const summary = {
    NORMAL: t('budgets.usage.remaining', { amount: money(usage.remainingMinor) }),
    EXCEEDED: t('budgets.usage.exceeded', { amount: money(-usage.remainingMinor) }),
    SAVED: t('budgets.usage.saved', { amount: money(usage.remainingMinor) }),
  }[state];
  const summaryColor = exceeded ? colors.over : state === 'SAVED' ? colors.positive : colors.ink;

  return (
    <View style={styles.wrap}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('budgets.usage.percent', { percent })}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(barFillPercentage(usage)) }}
        style={[
          styles.track,
          { backgroundColor: colors.line, borderColor: exceeded ? colors.over : colors.line },
        ]}
      >
        <View
          style={[
            styles.fill,
            { width: `${barFillPercentage(usage)}%`, backgroundColor: colors.manila },
          ]}
        />
      </View>
      <View style={styles.row}>
        <AppText variant="muted">
          {t('budgets.usage.spentOf', {
            spent: money(usage.spentMinor),
            available: money(usage.availableMinor),
          })}
        </AppText>
        <AppText variant="muted" style={exceeded ? { color: colors.over } : undefined}>
          {exceeded ? `${t('budgets.usage.exceededTag')} · ${percent}` : percent}
        </AppText>
      </View>
      <AppText style={{ color: summaryColor, fontWeight: '700' }}>{summary}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  track: { height: 14, borderRadius: 7, borderWidth: 1, overflow: 'hidden' },
  fill: { height: '100%' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
});
