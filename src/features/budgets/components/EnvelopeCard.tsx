import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDateRange, formatMoney } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import { AppText } from '@/core/theme/AppText';
import { useTheme } from '@/core/theme/ThemeProvider';

import { getCategoryLabel } from '../../categories/category.rules';
import type { Category } from '../../categories/category.types';
import type { BudgetItem } from '../budget.types';
import { EnvelopeFrame, leftPercentage } from '@/core/theme/EnvelopeFrame';

export const ENVELOPE_CARD_HEIGHT = 200;

type Props = {
  item: BudgetItem;
  category: Category | undefined;
  width: number;
  onPress: () => void;
};

// One budget as an envelope in the grid of the home and the budgets list: filled up to what is
// left, the band of its category on the left, its name and period, and what is left at the bottom.
export function EnvelopeCard({ item, category, width, onPress }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = getAppLanguage();
  const { budget, phase, usage, state } = item;
  const exceeded = state === 'EXCEEDED';
  const label = category ? getCategoryLabel(category, t) : '';
  const period = formatDateRange(budget.startDate, budget.endDate, language);
  const money = (amountMinor: number) =>
    formatMoney({ amountMinor, currency: budget.currency }, language);

  // Left / exceeded / saved (RN-29, RN-09) and the amount that goes with it.
  const caption = exceeded
    ? t('budgets.envelope.over')
    : state === 'SAVED'
      ? t('budgets.envelope.saved')
      : t('budgets.envelope.left');
  const amount = money(Math.abs(usage.remainingMinor));
  const small = exceeded
    ? t('budgets.envelope.exceededTag')
    : phase === 'ACTIVE'
      ? period
      : `${period} · ${t(`budgets.phase.${phase}`)}`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ width }}
      accessibilityLabel={`${label}, ${caption} ${amount}`}
    >
      <EnvelopeFrame
        height={ENVELOPE_CARD_HEIGHT}
        radius={10}
        fillPercent={exceeded ? 0 : leftPercentage(usage.remainingMinor, usage.availableMinor)}
        bandColor={category?.color ?? colors.mute}
        bandLeft={22}
        bandWidth={8}
        flapHeight={46}
        exceeded={exceeded}
      >
        <View style={styles.label}>
          <AppText weight="bold" numberOfLines={2} style={styles.name}>
            {label}
          </AppText>
          <AppText weight="medium" style={[styles.small, { color: colors.ink }]}>
            {small}
          </AppText>
        </View>
        <View style={styles.amount}>
          <AppText weight="semibold" style={[styles.small, { color: colors.ink }]}>
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
        </View>
      </EnvelopeFrame>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { position: 'absolute', left: 40, right: 10, top: 54 },
  name: { fontSize: 15 },
  small: { fontSize: 12, marginTop: 2 },
  amount: { position: 'absolute', left: 40, right: 10, bottom: 12 },
  big: { fontSize: 26 },
});
