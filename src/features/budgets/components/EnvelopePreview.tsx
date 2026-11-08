import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { formatDateRange, formatMoney } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import { AppText } from '@/core/theme/AppText';
import { useTheme } from '@/core/theme/ThemeProvider';

import { AUTOMATIC_THRESHOLD_PERCENTAGE } from '../../alerts/alert.types';
import { getCategoryLabel } from '../../categories/category.rules';
import type { BudgetPreview } from '../useBudgetForm';
import { EnvelopeFrame } from '@/core/theme/EnvelopeFrame';
import { ThresholdBands } from './ThresholdBands';

const PREVIEW_HEIGHT = 190;

type Props = {
  preview: BudgetPreview;
  // Alert percentages typed in the form; the automatic 100 % is always added (RN-25).
  thresholds: readonly number[];
};

// The envelope being made, drawn at the top of the budget form and updated while the user fills
// it: band in the category color, name, period, the amount, and the alerts as dashed bands.
// It is full: nothing has been spent from a budget that is still being written.
export function EnvelopePreview({ preview, thresholds }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = getAppLanguage();
  const name = preview.category
    ? getCategoryLabel(preview.category, t)
    : t('budgets.form.preview.pickCategory');
  const period = formatDateRange(preview.startDate, preview.endDate, language);
  const amount = formatMoney(
    { amountMinor: preview.amountMinor, currency: preview.currency },
    language,
  );
  const bands = [...new Set([...thresholds, AUTOMATIC_THRESHOLD_PERCENTAGE])]
    .filter((percentage) => percentage >= 1 && percentage <= AUTOMATIC_THRESHOLD_PERCENTAGE)
    .sort((a, b) => a - b)
    .map((percentage) => ({ percentage, crossed: false }));

  return (
    <EnvelopeFrame
      height={PREVIEW_HEIGHT}
      radius={14}
      fillPercent={100}
      bandColor={preview.category?.color ?? colors.line}
      bandLeft={24}
      bandWidth={10}
      flapHeight={40}
      exceeded={false}
      accessibilityLabel={t('budgets.form.preview.label', { name, period, amount })}
    >
      <ThresholdBands bands={bands} />
      <View style={styles.texts} pointerEvents="none">
        {/* Always ink: muted grey has too little contrast on the manila fill (DESIGN.md). */}
        <AppText weight="bold" numberOfLines={1} style={[styles.name, { color: colors.ink }]}>
          {name}
        </AppText>
        <AppText style={[styles.small, { color: colors.ink }]}>{period}</AppText>
        <AppText weight="semibold" style={[styles.caption, { color: colors.ink }]}>
          {t('budgets.form.preview.caption')}
        </AppText>
        <AppText
          condensed
          adjustsFontSizeToFit
          numberOfLines={1}
          style={[styles.amount, { color: colors.ink }]}
        >
          {amount}
        </AppText>
      </View>
    </EnvelopeFrame>
  );
}

const styles = StyleSheet.create({
  // Room on the right for the labels of the bands, so the amount never goes under them.
  texts: { position: 'absolute', left: 46, right: 80, top: 46, gap: 1 },
  name: { fontSize: 16 },
  small: { fontSize: 12 },
  caption: { fontSize: 12, marginTop: 10 },
  amount: { fontSize: 40, lineHeight: 46 },
});
