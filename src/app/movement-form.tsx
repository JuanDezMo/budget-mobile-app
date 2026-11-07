import { router, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/core/theme/Screen';
import { useCategories } from '@/features/categories/useCategories';
import { MovementForm } from '@/features/movements/components/MovementForm';

// New movement, or edit / delete when an `id` is given.
export default function MovementFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { system, custom, archived } = useCategories();

  return (
    <Screen>
      <MovementForm
        categories={[...system, ...custom, ...archived]}
        movementId={id}
        onSaved={() => router.back()}
      />
    </Screen>
  );
}
