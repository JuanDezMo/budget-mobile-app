import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { PrimaryButton } from '@/core/theme/PrimaryButton';

import type { Category } from '../../categories/category.types';
import { getBudgetPhase } from '../budget.rules';
import { useBudgets } from '../useBudgets';
import { BudgetCard } from './BudgetCard';

type Props = {
  categories: readonly Category[];
  onCreate: () => void;
  onOpen: (budgetId: string) => void;
};

// Budgets grouped by phase: active, in grace and closed (RN-05).
export function BudgetList({ categories, onCreate, onOpen }: Props) {
  const { t } = useTranslation();
  const { active, grace, closed, today, isLoading } = useBudgets();
  if (isLoading) return null;

  const sections = [
    { key: 'sectionActive', budgets: active },
    { key: 'sectionGrace', budgets: grace },
    { key: 'sectionClosed', budgets: closed },
  ] as const;
  const isEmpty = active.length + grace.length + closed.length === 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <PrimaryButton label={t('budgets.new')} onPress={onCreate} />
      {isEmpty ? <AppText variant="muted">{t('budgets.empty')}</AppText> : null}
      {sections.map((section) =>
        section.budgets.length === 0 ? null : (
          <Fragment key={section.key}>
            <AppText variant="muted">{t(`budgets.${section.key}`)}</AppText>
            {section.budgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                category={categories.find((category) => category.id === budget.categoryId)}
                phase={getBudgetPhase(budget, today)}
                onPress={() => onOpen(budget.id)}
              />
            ))}
          </Fragment>
        ),
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { gap: 10, paddingBottom: 32 } });
