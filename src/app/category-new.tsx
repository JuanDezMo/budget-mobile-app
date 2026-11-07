import { router } from 'expo-router';

import { Screen } from '@/core/theme/Screen';
import { CategoryForm } from '@/features/categories/components/CategoryForm';

export default function NewCategoryScreen() {
  return (
    <Screen>
      <CategoryForm onCreated={() => router.back()} />
    </Screen>
  );
}
