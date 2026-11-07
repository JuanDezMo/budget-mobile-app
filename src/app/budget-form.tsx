import { router, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/core/theme/Screen';
import { ThresholdEditor } from '@/features/alerts/components/ThresholdEditor';
import { useThresholdDraft } from '@/features/alerts/useThresholdDraft';
import { BudgetForm } from '@/features/budgets/components/BudgetForm';
import { useCategories } from '@/features/categories/useCategories';

// New budget, or edit when an `id` is given. The alert thresholds (alerts feature) are part of the
// form: the budget is saved first, then its thresholds with the id it got.
export default function BudgetFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { system, custom, archived } = useCategories();
  const thresholds = useThresholdDraft({ budgetId: id });

  return (
    <Screen topInset={false}>
      <BudgetForm
        categories={[...system, ...custom, ...archived]}
        budgetId={id}
        extraSection={<ThresholdEditor draft={thresholds} />}
        extraValid={thresholds.isValid}
        onSaved={async (savedId) => {
          await thresholds.save(savedId);
          router.back();
        }}
      />
    </Screen>
  );
}
