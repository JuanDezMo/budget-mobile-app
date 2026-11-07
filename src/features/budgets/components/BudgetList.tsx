import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { FLOATING_ACTION_SPACE, FloatingAction } from '@/core/theme/FloatingAction';

import type { Category } from '../../categories/category.types';
import { useBudgets } from '../useBudgets';
import { BudgetCard } from './BudgetCard';

type Props = {
  refreshKey?: number; // changes when the screen regains focus, to load again
  categories: readonly Category[];
  onCreate: () => void;
  onOpen: (budgetId: string) => void;
};

// Budgets grouped by phase: active, in grace and closed (RN-05).
export function BudgetList({ refreshKey, categories, onCreate, onOpen }: Props) {
  const { t } = useTranslation();
  const { active, grace, closed, isLoading } = useBudgets(refreshKey);
  if (isLoading) return null;

  const sections = [
    { key: 'sectionActive', budgets: active },
    { key: 'sectionGrace', budgets: grace },
    { key: 'sectionClosed', budgets: closed },
  ] as const;
  const isEmpty = active.length + grace.length + closed.length === 0;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {isEmpty ? <AppText variant="muted">{t('budgets.empty')}</AppText> : null}
        {sections.map((section) =>
          section.budgets.length === 0 ? null : (
            <Fragment key={section.key}>
              <AppText variant="muted">{t(`budgets.${section.key}`)}</AppText>
              {section.budgets.map((item) => (
                <BudgetCard
                  key={item.budget.id}
                  item={item}
                  category={categories.find((category) => category.id === item.budget.categoryId)}
                  onPress={() => onOpen(item.budget.id)}
                />
              ))}
            </Fragment>
          ),
        )}
      </ScrollView>
      <FloatingAction label={t('budgets.new')} onPress={onCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 10, paddingBottom: FLOATING_ACTION_SPACE },
});
