import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { formatLocalDate, formatMoney } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import { AppText } from '@/core/theme/AppText';
import { CategoryAvatar } from '@/core/theme/CategoryAvatar';
import { PrimaryButton } from '@/core/theme/PrimaryButton';
import { useTheme } from '@/core/theme/ThemeProvider';

import { getCategoryLabel } from '../../categories/category.rules';
import type { Category } from '../../categories/category.types';
import { useBudgetDetail } from '../useBudgetDetail';

type Props = {
  budgetId: string;
  categories: readonly Category[];
  onEdit: () => void;
  onDeleted: () => void;
};

// Budget detail with edit (only while active, RN-06/07/08) and delete (RN-10).
export function BudgetDetail({ budgetId, categories, onEdit, onDeleted }: Props) {
  const { t } = useTranslation();
  const { budget, phase, canEdit, isLoading, remove } = useBudgetDetail(budgetId);
  const { colors } = useTheme();
  const language = getAppLanguage();
  if (isLoading) return null;
  if (!budget || !phase) return <AppText>{t('budgets.detail.notFound')}</AppText>;
  const category = categories.find((candidate) => candidate.id === budget.categoryId);

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

      <AppText variant="muted">{t('budgets.detail.amount')}</AppText>
      <AppText>
        {formatMoney({ amountMinor: budget.amountMinor, currency: budget.currency }, language)}
      </AppText>

      <AppText variant="muted">{t('budgets.detail.period')}</AppText>
      <AppText>
        {t('budgets.period', {
          start: formatLocalDate(budget.startDate, language),
          end: formatLocalDate(budget.endDate, language),
        })}
      </AppText>

      <AppText variant="muted">{t('budgets.detail.status')}</AppText>
      <AppText>{t(`budgets.phase.${phase}`)}</AppText>

      {canEdit ? <PrimaryButton label={t('budgets.detail.edit')} onPress={onEdit} /> : null}
      <PrimaryButton label={t('budgets.detail.delete')} onPress={confirmDelete} tone="danger" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 8, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
});
