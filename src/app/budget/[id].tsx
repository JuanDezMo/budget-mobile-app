import { router, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/core/theme/Screen';
import { BudgetDetail } from '@/features/budgets/components/BudgetDetail';
import { useCategories } from '@/features/categories/useCategories';

const BUDGET_FORM_ROUTE = '/budget-form';

export default function BudgetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { system, custom, archived } = useCategories();
  const categories = [...system, ...custom, ...archived];

  return (
    <Screen>
      <BudgetDetail
        budgetId={id}
        categories={categories}
        onEdit={() => router.push({ pathname: BUDGET_FORM_ROUTE, params: { id } })}
        onDeleted={() => router.back()}
      />
    </Screen>
  );
}
