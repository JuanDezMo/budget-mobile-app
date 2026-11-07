import { router, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/core/theme/Screen';
import { BudgetForm } from '@/features/budgets/components/BudgetForm';
import { useCategories } from '@/features/categories/useCategories';

// New budget, or edit when an `id` is given.
export default function BudgetFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { system, custom, archived } = useCategories();

  return (
    <Screen>
      <BudgetForm
        categories={[...system, ...custom, ...archived]}
        budgetId={id}
        onSaved={() => router.back()}
      />
    </Screen>
  );
}
