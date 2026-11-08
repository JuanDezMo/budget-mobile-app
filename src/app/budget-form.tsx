import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/core/theme/Screen';
import { ThresholdEditor } from '@/features/alerts/components/ThresholdEditor';
import { useThresholdDraft } from '@/features/alerts/useThresholdDraft';
import { BudgetForm } from '@/features/budgets/components/BudgetForm';
import { useCategories } from '@/features/categories/useCategories';

// New budget, or edit when an `id` is given. The alert thresholds (alerts feature) are part of the
// form: the budget is saved first, then its thresholds with the id it got.
export default function BudgetFormScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { system, custom, archived } = useCategories();
  const thresholds = useThresholdDraft({ budgetId: id });

  return (
    <Screen topInset={false}>
      <Stack.Screen
        options={{ title: id ? t('budgets.form.editTitle') : t('budgets.form.newTitle') }}
      />
      <BudgetForm
        categories={[...system, ...custom, ...archived]}
        budgetId={id}
        extraSection={<ThresholdEditor draft={thresholds} />}
        extraValid={thresholds.isValid}
        previewThresholds={thresholds.percentages}
        onSaved={async (savedId) => {
          await thresholds.save(savedId);
          router.back();
        }}
      />
    </Screen>
  );
}
