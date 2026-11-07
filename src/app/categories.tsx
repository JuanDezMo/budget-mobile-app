import { router } from 'expo-router';

import { Screen } from '@/core/theme/Screen';
import { CategoryList } from '@/features/categories/components/CategoryList';

const NEW_CATEGORY_ROUTE = '/category-new';

export default function CategoriesScreen() {
  return (
    <Screen>
      <CategoryList onCreate={() => router.push(NEW_CATEGORY_ROUTE)} />
    </Screen>
  );
}
