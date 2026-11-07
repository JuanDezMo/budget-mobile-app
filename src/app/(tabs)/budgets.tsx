import { router } from 'expo-router';

import { useRefreshOnFocus } from '@/core/shared/use-refresh-on-focus';
import { Screen } from '@/core/theme/Screen';
import { BudgetList } from '@/features/budgets/components/BudgetList';
import { useCategories } from '@/features/categories/useCategories';

const NEW_BUDGET_ROUTE = '/budget-form';
const BUDGET_DETAIL_ROUTE = '/budget/[id]';

export default function BudgetsScreen() {
  const refreshKey = useRefreshOnFocus();
  const { system, custom, archived } = useCategories(refreshKey);

  return (
    <Screen>
      <BudgetList
        refreshKey={refreshKey}
        categories={[...system, ...custom, ...archived]}
        onCreate={() => router.push(NEW_BUDGET_ROUTE)}
        onOpen={(id) => router.push({ pathname: BUDGET_DETAIL_ROUTE, params: { id } })}
      />
    </Screen>
  );
}
