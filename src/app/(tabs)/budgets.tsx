import { router } from 'expo-router';

import { Screen } from '@/core/theme/Screen';
import { BudgetList } from '@/features/budgets/components/BudgetList';
import { useCategories } from '@/features/categories/useCategories';

const NEW_BUDGET_ROUTE = '/budget-form';
const BUDGET_DETAIL_ROUTE = '/budget/[id]';

export default function BudgetsScreen() {
  const { system, custom, archived } = useCategories();

  return (
    <Screen>
      <BudgetList
        categories={[...system, ...custom, ...archived]}
        onCreate={() => router.push(NEW_BUDGET_ROUTE)}
        onOpen={(id) => router.push({ pathname: BUDGET_DETAIL_ROUTE, params: { id } })}
      />
    </Screen>
  );
}
