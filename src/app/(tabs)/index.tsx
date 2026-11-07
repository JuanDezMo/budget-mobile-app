import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useRefreshOnFocus } from '@/core/shared/use-refresh-on-focus';
import { AppText } from '@/core/theme/AppText';
import { Screen } from '@/core/theme/Screen';
import { OpenBudgetsOverview } from '@/features/budgets/components/OpenBudgetsOverview';
import { useCategories } from '@/features/categories/useCategories';

const BUDGET_DETAIL_ROUTE = '/budget/[id]';

// Home: what is left to spend per currency and the open budgets.
export default function HomeScreen() {
  const { t } = useTranslation();
  const refreshKey = useRefreshOnFocus();
  const { system, custom, archived } = useCategories(refreshKey);

  return (
    <Screen>
      <AppText variant="title">{t('home.title')}</AppText>
      <OpenBudgetsOverview
        refreshKey={refreshKey}
        categories={[...system, ...custom, ...archived]}
        onOpen={(id) => router.push({ pathname: BUDGET_DETAIL_ROUTE, params: { id } })}
      />
    </Screen>
  );
}
