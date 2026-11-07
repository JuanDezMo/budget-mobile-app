import { z } from 'zod';

import { parseAmountToMinor } from '@/core/shared/amount';
import { CURRENCY_CODES } from '@/core/shared/currency';
import { isValidLocalDate } from '@/core/shared/dates';

// What the budget form sends: the amount as the user typed it. Messages are error codes;
// the screen shows t(`errors.${code}`).
export const budgetFormSchema = z
  .object({
    categoryId: z.string().min(1, 'BUDGET_CATEGORY_REQUIRED'),
    currency: z.enum(CURRENCY_CODES, { error: 'BUDGET_CURRENCY_REQUIRED' }),
    amount: z.string(),
    startDate: z.string().refine((date): boolean => isValidLocalDate(date), 'BUDGET_DATE_INVALID'),
    endDate: z.string().refine((date): boolean => isValidLocalDate(date), 'BUDGET_DATE_INVALID'),
  })
  .superRefine((values, context) => {
    // RN-01 + RN-20: a valid amount for the chosen currency, greater than 0.
    const amount = parseAmountToMinor(values.amount, values.currency);
    if (!amount.ok) {
      context.addIssue({ code: 'custom', path: ['amount'], message: amount.error });
    } else if (amount.value <= 0) {
      context.addIssue({ code: 'custom', path: ['amount'], message: 'BUDGET_AMOUNT_INVALID' });
    }
    // RN-01: start <= end.
    if (values.startDate > values.endDate) {
      context.addIssue({ code: 'custom', path: ['endDate'], message: 'BUDGET_DATES_INVALID' });
    }
  });

export type BudgetFormValues = z.infer<typeof budgetFormSchema>;
