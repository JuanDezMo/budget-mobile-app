import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useRefreshOnFocus } from '@/core/shared/use-refresh-on-focus';
import { FloatingAction } from '@/core/theme/FloatingAction';
import { Screen } from '@/core/theme/Screen';
import { OpenBudgetsOverview } from '@/features/budgets/components/OpenBudgetsOverview';
import { useCategories } from '@/features/categories/useCategories';

const BUDGET_DETAIL_ROUTE = '/budget/[id]';
const NEW_MOVEMENT_ROUTE = '/movement-form';

// Home: what is left to spend per currency, the open budgets as envelopes, and the quick action
// to add an expense (bottom right).
export default function HomeScreen() {
  const { t } = useTranslation();
  const refreshKey = useRefreshOnFocus();
  const { system, custom, archived } = useCategories(refreshKey);

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <OpenBudgetsOverview
          refreshKey={refreshKey}
          categories={[...system, ...custom, ...archived]}
          onOpen={(id) => router.push({ pathname: BUDGET_DETAIL_ROUTE, params: { id } })}
        />
        <FloatingAction
          variant="pill"
          label={t('home.addExpense')}
          onPress={() => router.push(NEW_MOVEMENT_ROUTE)}
        />
      </View>
    </Screen>
  );
}
