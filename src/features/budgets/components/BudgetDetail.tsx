import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { formatLocalDate, formatMoney } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import { AppText } from '@/core/theme/AppText';
import { CategoryAvatar } from '@/core/theme/CategoryAvatar';
import { PrimaryButton } from '@/core/theme/PrimaryButton';
import { useTheme } from '@/core/theme/ThemeProvider';

import { getCategoryLabel } from '../../categories/category.rules';
import type { Category } from '../../categories/category.types';
import { useBudgetDetail } from '../useBudgetDetail';
import { UsageBar } from './UsageBar';

type Props = {
  refreshKey?: number;
  budgetId: string;
  categories: readonly Category[];
  onEdit: () => void;
  onDeleted: () => void;
  onOpenMovement: (movementId: string) => void;
};

// Budget detail: how much is used, the movements counting for it, edit (only while active,
// RN-06/07/08) and delete (RN-10).
export function BudgetDetail({
  refreshKey,
  budgetId,
  categories,
  onEdit,
  onDeleted,
  onOpenMovement,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const {
    budget,
    phase,
    usage,
    state,
    lines,
    hasMoreLines,
    isLoadingMore,
    loadMoreLines,
    canEdit,
    isLoading,
    remove,
  } = useBudgetDetail(budgetId, refreshKey);
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
      <View style={styles.header}>
        <CategoryAvatar icon={category?.icon ?? ''} color={category?.color ?? colors.mute} />
        <AppText variant="title">{category ? getCategoryLabel(category, t) : ''}</AppText>
      </View>

      <UsageBar usage={usage} state={state} currency={budget.currency} />

      <View style={styles.figures}>
        <View style={styles.figure}>
          <AppText variant="muted">{t('budgets.detail.amount')}</AppText>
          <AppText>{money(budget.amountMinor)}</AppText>
        </View>
        <View style={styles.figure}>
          <AppText variant="muted">{t('budgets.detail.spent')}</AppText>
          <AppText>{money(usage.spentMinor)}</AppText>
        </View>
        <View style={styles.figure}>
          <AppText variant="muted">{t('budgets.detail.available')}</AppText>
          <AppText>{money(usage.availableMinor)}</AppText>
        </View>
      </View>

      <AppText variant="muted">{t('budgets.detail.period')}</AppText>
      <AppText>
        {t('budgets.period', {
          start: formatLocalDate(budget.startDate, language),
          end: formatLocalDate(budget.endDate, language),
        })}
      </AppText>
      <AppText variant="muted">{t('budgets.detail.status')}</AppText>
      <AppText>{t(`budgets.phase.${phase}`)}</AppText>

      <AppText variant="muted" style={styles.sectionTitle}>
        {t('budgets.detail.lines')}
      </AppText>
      {lines.length === 0 ? <AppText variant="muted">{t('budgets.detail.noLines')}</AppText> : null}
      {lines.map((line) => {
        const lineCategory = categories.find((candidate) => candidate.id === line.categoryId);
        const amount = money(line.amountMinor);

        return (
          <Pressable
            key={line.lineId}
            accessibilityRole="button"
            accessibilityLabel={`${t('budgets.detail.openLine')}: ${t(`movements.kind.${line.kind}`)} ${amount}`}
            onPress={() => onOpenMovement(line.movementId)}
            style={[styles.line, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <View style={styles.lineText}>
              <AppText>{t(`movements.kind.${line.kind}`)}</AppText>
              <AppText variant="muted">
                {lineCategory ? getCategoryLabel(lineCategory, t) : ''} ·{' '}
                {formatLocalDate(line.localDate, language)}
              </AppText>
              {line.note ? <AppText variant="muted">{line.note}</AppText> : null}
            </View>
            <AppText
              style={{
                fontWeight: '700',
                color: line.kind === 'EXPENSE' ? colors.ink : colors.positive,
              }}
            >
              {line.kind === 'EXPENSE' ? '−' : '+'}
              {amount}
            </AppText>
          </Pressable>
        );
      })}
      {hasMoreLines ? (
        <PrimaryButton
          label={t('budgets.detail.showMore')}
          onPress={() => void loadMoreLines()}
          disabled={isLoadingMore}
        />
      ) : null}

      {canEdit ? <PrimaryButton label={t('budgets.detail.edit')} onPress={onEdit} /> : null}
      <PrimaryButton label={t('budgets.detail.delete')} onPress={confirmDelete} tone="danger" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 8, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  figures: { flexDirection: 'row', gap: 12, marginVertical: 8 },
  figure: { flex: 1 },
  sectionTitle: { marginTop: 16 },
  line: {
    minHeight: 64,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lineText: { flex: 1, gap: 2 },
});
