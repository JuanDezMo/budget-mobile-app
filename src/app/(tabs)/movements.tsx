import { router } from 'expo-router';

import { useRefreshOnFocus } from '@/core/shared/use-refresh-on-focus';
import { Screen } from '@/core/theme/Screen';
import { useCategories } from '@/features/categories/useCategories';
import { MovementList } from '@/features/movements/components/MovementList';

const NEW_MOVEMENT_ROUTE = '/movement-form';

export default function MovementsScreen() {
  const refreshKey = useRefreshOnFocus();
  const { system, custom, archived } = useCategories(refreshKey);

  return (
    <Screen>
      <MovementList
        refreshKey={refreshKey}
        categories={[...system, ...custom, ...archived]}
        onCreate={() => router.push(NEW_MOVEMENT_ROUTE)}
        onOpen={(id) => router.push({ pathname: NEW_MOVEMENT_ROUTE, params: { id } })}
      />
    </Screen>
  );
}
