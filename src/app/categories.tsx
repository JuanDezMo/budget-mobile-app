import { router } from 'expo-router';

import { useRefreshOnFocus } from '@/core/shared/use-refresh-on-focus';
import { Screen } from '@/core/theme/Screen';
import { CategoryList } from '@/features/categories/components/CategoryList';

const NEW_CATEGORY_ROUTE = '/category-new';

export default function CategoriesScreen() {
  const refreshKey = useRefreshOnFocus();
  return (
    <Screen topInset={false}>
      <CategoryList refreshKey={refreshKey} onCreate={() => router.push(NEW_CATEGORY_ROUTE)} />
    </Screen>
  );
}
