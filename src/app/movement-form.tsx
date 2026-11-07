import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { Screen } from '@/core/theme/Screen';
import { useCategories } from '@/features/categories/useCategories';
import { MovementForm } from '@/features/movements/components/MovementForm';

// A symbol, not text: its meaning is in the accessibility label of the button.
const CLOSE_SYMBOL = '✕';

// New movement, or edit / delete when an `id` is given. The header has a close (✕) on the left,
// as in the sketches.
export default function MovementFormScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { system, custom, archived } = useCategories();

  return (
    <Screen topInset={false}>
      <Stack.Screen
        options={{
          title: id ? t('movements.form.editTitle') : t('movements.form.newTitle'),
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('movements.form.close')}
              onPress={() => router.back()}
              style={{
                minHeight: 44,
                minWidth: 44,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <AppText weight="bold">{CLOSE_SYMBOL}</AppText>
            </Pressable>
          ),
        }}
      />
      <MovementForm
        categories={[...system, ...custom, ...archived]}
        movementId={id}
        onSaved={() => router.back()}
      />
    </Screen>
  );
}
