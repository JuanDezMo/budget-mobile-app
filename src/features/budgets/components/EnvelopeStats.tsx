import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { formatMoney, formatPercentage } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import type { CurrencyCode } from '@/core/shared/currency';
import { AppText } from '@/core/theme/AppText';
import { useTheme } from '@/core/theme/ThemeProvider';

import type { BudgetUsage, UsageTotals } from '../budget.types';

type Props = { currency: CurrencyCode; totals: UsageTotals; usage: BudgetUsage };

// Three figures under the big envelope: what was spent, refunded, and the share used.
export function EnvelopeStats({ currency, totals, usage }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = getAppLanguage();
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency }, language);
  const cells = [
    { key: 'statSpent', value: money(totals.expenseMinor) },
    {
      key: 'statRefunds',
      value: totals.refundMinor > 0 ? `−${money(totals.refundMinor)}` : money(0),
    },
    { key: 'statUsed', value: formatPercentage(usage.percentage, language) },
  ] as const;

  return (
    <View style={[styles.stats, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      {cells.map((cell, index) => (
        <View
          key={cell.key}
          style={[styles.cell, index > 0 && { borderLeftWidth: 1, borderLeftColor: colors.line }]}
        >
          <AppText variant="muted" style={styles.label}>
            {t(`budgets.detail.${cell.key}`)}
          </AppText>
          <AppText weight="bold" adjustsFontSizeToFit numberOfLines={1}>
            {cell.value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', borderWidth: 1, borderRadius: 12 },
  cell: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, gap: 2 },
  label: { fontSize: 12 },
});
