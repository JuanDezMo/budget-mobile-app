import { useTranslation } from 'react-i18next';

import { formatDateRange } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import type { CurrencyCode } from '@/core/shared/currency';
import { AppText } from '@/core/theme/AppText';
import { useTheme } from '@/core/theme/ThemeProvider';

import { getCategoryLabel } from '../../categories/category.rules';
import type { Category } from '../../categories/category.types';
import type { LineAssignment } from '../movement.rules';

// Under each line: "Counts for: Fun · Nov 1–15", "No active envelope in COP" or a warning
// (RN-17, RN-18, RN-41). The user only reads this; the envelope is never chosen by hand.
// For an income the line says it adds to the envelope instead (RN-23).
export function LineAssignmentText({
  assignment,
  categories,
  currency,
  isIncome,
}: {
  assignment: LineAssignment | undefined;
  categories: readonly Category[];
  currency: CurrencyCode;
  isIncome: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!assignment) return null;

  if (assignment.kind === 'BUDGET') {
    const category = categories.find((candidate) => candidate.id === assignment.budget.categoryId);

    return (
      <AppText variant="muted" style={{ fontSize: 12 }}>
        {`✉ ${t(isIncome ? 'movements.assignment.addsTo' : 'movements.assignment.counts', {
          category: category ? getCategoryLabel(category, t) : '',
          period: formatDateRange(
            assignment.budget.startDate,
            assignment.budget.endDate,
            getAppLanguage(),
          ),
        })}`}
      </AppText>
    );
  }
  if (assignment.kind === 'CLOSED_BUDGET') {
    return (
      <AppText variant="muted" style={{ fontSize: 12, color: colors.over }}>
        {t('movements.assignment.closed')}
      </AppText>
    );
  }

  return (
    <AppText variant="muted" style={{ fontSize: 12, color: colors.over }}>
      {t('movements.assignment.noneIn', { currency })}
    </AppText>
  );
}
