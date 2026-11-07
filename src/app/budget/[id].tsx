import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { useRefreshOnFocus } from '@/core/shared/use-refresh-on-focus';
import { AppText } from '@/core/theme/AppText';
import { Screen } from '@/core/theme/Screen';
import { useTheme } from '@/core/theme/ThemeProvider';
import { useThresholdPercentages } from '@/features/alerts/useThresholdPercentages';
import { BudgetDetail } from '@/features/budgets/components/BudgetDetail';
import { useBudgetDetail } from '@/features/budgets/useBudgetDetail';
import { useCategories } from '@/features/categories/useCategories';

const BUDGET_FORM_ROUTE = '/budget-form';
const MOVEMENT_FORM_ROUTE = '/movement-form';

export default function BudgetDetailScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const refreshKey = useRefreshOnFocus();
  const { system, custom, archived, labelOf } = useCategories(refreshKey);
  const categories = [...system, ...custom, ...archived];
  const detail = useBudgetDetail(id, refreshKey);
  const thresholds = useThresholdPercentages(refreshKey)[id] ?? [];
  const category = categories.find((candidate) => candidate.id === detail.budget?.categoryId);

  return (
    <Screen topInset={false}>
      {/* The header carries the name of the envelope and "Edit" (only while it can be edited). */}
      <Stack.Screen
        options={{
          title: category ? labelOf(category) : t('budgets.detail.title'),
          headerRight: detail.canEdit
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('budgets.detail.edit')}
                  onPress={() => router.push({ pathname: BUDGET_FORM_ROUTE, params: { id } })}
                  style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}
                >
                  <AppText weight="semibold" style={{ color: colors.mute }}>
                    {t('budgets.detail.edit')}
                  </AppText>
                </Pressable>
              )
            : undefined,
        }}
      />
      <BudgetDetail
        detail={detail}
        categories={categories}
        thresholds={thresholds}
        onDeleted={() => router.back()}
        onOpenMovement={(movementId) =>
          router.push({ pathname: MOVEMENT_FORM_ROUTE, params: { id: movementId } })
        }
      />
    </Screen>
  );
}
