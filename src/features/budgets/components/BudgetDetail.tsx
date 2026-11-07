import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { formatMoney, formatShortDate } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import { AppText } from '@/core/theme/AppText';
import { iconToEmoji } from '@/core/theme/category-icons';
import { PrimaryButton } from '@/core/theme/PrimaryButton';
import { useTheme } from '@/core/theme/ThemeProvider';

import type { Category } from '../../categories/category.types';
import type { useBudgetDetail } from '../useBudgetDetail';
import { EnvelopeHero } from './EnvelopeHero';
import { EnvelopeStats } from './EnvelopeStats';

type Detail = ReturnType<typeof useBudgetDetail>;

type Props = {
  detail: Detail; // the screen owns the hook: it also needs it for the header
  categories: readonly Category[];
  thresholds: readonly number[];
  onDeleted: () => void;
  onOpenMovement: (movementId: string) => void;
};

// Budget detail: the big envelope with its alert bands, three figures, and the movements counting
// for it (RN-17). Edit is in the header (only while active, RN-06/07/08); delete is here (RN-10).
export function BudgetDetail({ detail, categories, thresholds, onDeleted, onOpenMovement }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const {
    budget,
    phase,
    usage,
    state,
    totals,
    lines,
    hasMoreLines,
    isLoadingMore,
    loadMoreLines,
    isLoading,
    remove,
  } = detail;
  const language = getAppLanguage();
  if (isLoading) return null;
  if (!budget || !phase || !usage || !state)
    return <AppText>{t('budgets.detail.notFound')}</AppText>;
  const category = categories.find((candidate) => candidate.id === budget.categoryId);
  const money = (amountMinor: number) =>
    formatMoney({ amountMinor, currency: budget.currency }, language);

  async function deleteBudget() {
    const result = await remove();
    if (result.ok) onDeleted();
    else Alert.alert(t('errors.UNEXPECTED'));
  }

  function confirmDelete() {
    Alert.alert(t('budgets.detail.deleteTitle'), t('budgets.detail.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('budgets.detail.delete'),
        style: 'destructive',
        onPress: () => void deleteBudget(),
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <EnvelopeHero
        budget={budget}
        phase={phase}
        usage={usage}
        state={state}
        category={category}
        thresholds={thresholds}
      />
      <EnvelopeStats currency={budget.currency} totals={totals} usage={usage} />

      <View style={styles.section}>
        <AppText variant="muted" weight="bold" style={styles.sectionText}>
          {t('budgets.detail.movements').toUpperCase()}
        </AppText>
        <AppText variant="muted" weight="bold" style={styles.sectionText}>
          {budget.currency}
        </AppText>
      </View>
      {lines.length === 0 ? <AppText variant="muted">{t('budgets.detail.noLines')}</AppText> : null}
      <View style={[styles.list, lines.length > 0 && { borderColor: colors.line }]}>
        {lines.map((line) => {
          const lineCategory = categories.find((candidate) => candidate.id === line.categoryId);
          const amount = money(line.amountMinor);
          const title = line.note ?? t(`movements.kind.${line.kind}`);

          return (
            <Pressable
              key={line.lineId}
              accessibilityRole="button"
              accessibilityLabel={`${t('budgets.detail.openLine')}: ${t(`movements.kind.${line.kind}`)} ${amount}`}
              onPress={() => onOpenMovement(line.movementId)}
              style={[
                styles.row,
                { backgroundColor: colors.surface, borderBottomColor: colors.line },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: colors.ground }]}>
                <AppText weight="bold">{iconToEmoji(lineCategory?.icon ?? '')}</AppText>
              </View>
              <View style={styles.rowText}>
                <AppText numberOfLines={1}>{title}</AppText>
                <AppText variant="muted" style={styles.rowSmall}>
                  {formatShortDate(line.localDate, language)} ·{' '}
                  {t(`movements.payment.${line.paymentMethod}`)}
                  {line.note ? '' : ''}
                </AppText>
              </View>
              <View style={styles.rowAmount}>
                <AppText
                  weight="bold"
                  style={{ color: line.kind === 'EXPENSE' ? colors.ink : colors.positive }}
                >
                  {line.kind === 'EXPENSE' ? '−' : '+'}
                  {amount}
                </AppText>
                {line.movementLineCount > 1 ? (
                  <View style={[styles.split, { borderColor: colors.line }]}>
                    <AppText variant="muted" weight="bold" style={styles.splitText}>
                      {t('budgets.detail.split', {
                        inBudget: line.budgetLineCount,
                        total: line.movementLineCount,
                      })}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      {hasMoreLines ? (
        <PrimaryButton
          label={t('budgets.detail.showMore')}
          onPress={() => void loadMoreLines()}
          disabled={isLoadingMore}
        />
      ) : null}

      <PrimaryButton label={t('budgets.detail.delete')} onPress={confirmDelete} tone="danger" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 32, paddingTop: 4 },
  section: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sectionText: { fontSize: 12, letterSpacing: 0.7 },
  list: { borderRadius: 12, overflow: 'hidden', borderWidth: 0 },
  row: {
    minHeight: 64,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 1 },
  rowSmall: { fontSize: 12 },
  rowAmount: { alignItems: 'flex-end', gap: 2 },
  split: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 5 },
  splitText: { fontSize: 11 },
});
