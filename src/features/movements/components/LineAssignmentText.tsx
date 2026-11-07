import { useTranslation } from 'react-i18next';

import { formatLocalDate } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import { AppText } from '@/core/theme/AppText';
import { useTheme } from '@/core/theme/ThemeProvider';

import { getCategoryLabel } from '../../categories/category.rules';
import type { Category } from '../../categories/category.types';
import type { LineAssignment } from '../movement.rules';

// "Counts for: Fun · 1 nov – 15 nov" / "No active budget" under each line (RN-17, RN-18, RN-41).
// The user only reads this; the budget is never chosen by hand.
export function LineAssignmentText({
  assignment,
  categories,
}: {
  assignment: LineAssignment | undefined;
  categories: readonly Category[];
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!assignment) return null;

  if (assignment.kind === 'BUDGET') {
    const language = getAppLanguage();
    const category = categories.find((candidate) => candidate.id === assignment.budget.categoryId);

    return (
      <AppText variant="muted" style={{ color: colors.positive }}>
        {t('movements.assignment.counts', {
          category: category ? getCategoryLabel(category, t) : '',
          start: formatLocalDate(assignment.budget.startDate, language),
          end: formatLocalDate(assignment.budget.endDate, language),
        })}
      </AppText>
    );
  }
  if (assignment.kind === 'CLOSED_BUDGET') {
    return (
      <AppText variant="muted" style={{ color: colors.over }}>
        {t('movements.assignment.closed')}
      </AppText>
    );
  }

  return <AppText variant="muted">{t('movements.assignment.none')}</AppText>;
}
