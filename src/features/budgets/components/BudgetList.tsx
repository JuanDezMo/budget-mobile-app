import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { FLOATING_ACTION_SPACE, FloatingAction } from '@/core/theme/FloatingAction';

import type { Category } from '../../categories/category.types';
import { useBudgets } from '../useBudgets';
import { EnvelopeGrid } from './EnvelopeGrid';

type Props = {
  refreshKey?: number; // changes when the screen regains focus, to load again
  categories: readonly Category[];
  onCreate: () => void;
  onOpen: (budgetId: string) => void;
};

// Budgets as envelopes, grouped by phase: active, in grace and closed (RN-05).
export function BudgetList({ refreshKey, categories, onCreate, onOpen }: Props) {
  const { t } = useTranslation();
  const { active, grace, closed, isLoading } = useBudgets(refreshKey);
  if (isLoading) return null;

  const sections = [
    { key: 'sectionActive', items: active },
    { key: 'sectionGrace', items: grace },
    { key: 'sectionClosed', items: closed },
  ] as const;
  const isEmpty = active.length + grace.length + closed.length === 0;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {isEmpty ? <AppText variant="muted">{t('budgets.empty')}</AppText> : null}
        {sections.map((section) =>
          section.items.length === 0 ? null : (
            <Fragment key={section.key}>
              <AppText variant="muted" weight="bold" style={styles.sectionTitle}>
                {t(`budgets.${section.key}`).toUpperCase()}
              </AppText>
              <EnvelopeGrid items={section.items} categories={categories} onOpen={onOpen} />
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
  content: { gap: 12, paddingBottom: FLOATING_ACTION_SPACE },
  sectionTitle: { fontSize: 12, letterSpacing: 0.7, marginTop: 4 },
});
