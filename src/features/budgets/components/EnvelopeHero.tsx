import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { formatDateRange, formatMoney } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import { AppText } from '@/core/theme/AppText';
import { useTheme } from '@/core/theme/ThemeProvider';

import { hasReachedThreshold } from '../../alerts/alert.rules';
import { AUTOMATIC_THRESHOLD_PERCENTAGE } from '../../alerts/alert.types';
import { getCategoryLabel } from '../../categories/category.rules';
import type { Category } from '../../categories/category.types';
import type { Budget, BudgetPhase, BudgetUsage, UsageState } from '../budget.types';
import { EnvelopeFrame, leftPercentage } from './EnvelopeFrame';
import { ThresholdBands } from './ThresholdBands';

export const ENVELOPE_HERO_HEIGHT = 250;

type Props = {
  budget: Budget;
  phase: BudgetPhase;
  usage: BudgetUsage;
  state: UsageState;
  category: Category | undefined;
  // Alert percentages of this budget (RN-24, RN-25): drawn as bands across the envelope.
  thresholds: readonly number[];
};

// The big envelope of the budget detail. The fill is what is left; the bands are the alert
// thresholds: dashed while not reached, solid with a dark label once crossed.
export function EnvelopeHero({ budget, phase, usage, state, category, thresholds }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = getAppLanguage();
  const exceeded = state === 'EXCEEDED';
  const money = (amountMinor: number) =>
    formatMoney({ amountMinor, currency: budget.currency }, language);
  const caption = exceeded
    ? t('budgets.detail.overBy')
    : state === 'SAVED'
      ? t('budgets.detail.savedLabel')
      : t('budgets.detail.leftInEnvelope');
  const amount = money(Math.abs(usage.remainingMinor));
  const label = category ? getCategoryLabel(category, t) : '';
  // RN-25: the 100% alert always exists, even for budgets created before thresholds were stored.
  const bands = [...new Set([...thresholds, AUTOMATIC_THRESHOLD_PERCENTAGE])].sort((a, b) => a - b);

  return (
    <EnvelopeFrame
      height={ENVELOPE_HERO_HEIGHT}
      radius={14}
      fillPercent={exceeded ? 0 : leftPercentage(usage.remainingMinor, usage.availableMinor)}
      bandColor={category?.color ?? colors.mute}
      bandLeft={28}
      bandWidth={10}
      flapHeight={46}
      exceeded={exceeded}
      accessibilityLabel={`${label}, ${caption} ${amount}`}
    >
      <ThresholdBands
        bands={bands.map((percentage) => ({
          percentage,
          crossed: hasReachedThreshold(usage.spentMinor, usage.availableMinor, percentage),
        }))}
      />

      <View style={styles.texts} pointerEvents="none">
        <AppText weight="semibold" style={[styles.caption, { color: colors.ink }]}>
          {caption}
        </AppText>
        <AppText
          condensed
          adjustsFontSizeToFit
          numberOfLines={1}
          style={[styles.big, { color: exceeded ? colors.over : colors.ink }]}
        >
          {amount}
        </AppText>
        <AppText numberOfLines={2} style={{ color: colors.ink }}>
          {t('budgets.detail.of', {
            available: money(usage.availableMinor),
            period: formatDateRange(budget.startDate, budget.endDate, language),
            phase: t(`budgets.phase.${phase}`).toLowerCase(),
          })}
        </AppText>
      </View>
    </EnvelopeFrame>
  );
}

const styles = StyleSheet.create({
  // Room on the right for the labels of the bands, so the big amount never goes under them.
  texts: { position: 'absolute', left: 52, right: 80, top: 58, gap: 2 },
  caption: { fontSize: 13 },
  big: { fontSize: 56, lineHeight: 62 },
});
