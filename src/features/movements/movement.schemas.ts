import { z } from 'zod';

import { parseAmountToMinor } from '@/core/shared/amount';
import { CURRENCY_CODES } from '@/core/shared/currency';
import { isValidLocalDate } from '@/core/shared/dates';

import { MOVEMENT_KINDS, PAYMENT_METHODS } from './movement.types';

export const MAX_NOTE_LENGTH = 200;

// What the movement form sends: amounts as the user typed them. Messages are error codes;
// the screen shows t(`errors.${code}`).
export const movementFormSchema = z
  .object({
    kind: z.enum(MOVEMENT_KINDS, { error: 'MOVEMENT_KIND_INVALID' }),
    currency: z.enum(CURRENCY_CODES, { error: 'BUDGET_CURRENCY_REQUIRED' }),
    total: z.string(),
    date: z.string().refine((date): boolean => isValidLocalDate(date), 'MOVEMENT_DATE_INVALID'),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'MOVEMENT_DATE_INVALID'),
    paymentMethod: z.enum(PAYMENT_METHODS, { error: 'PAYMENT_METHOD_REQUIRED' }),
    note: z.string().max(MAX_NOTE_LENGTH, 'MOVEMENT_NOTE_TOO_LONG'),
    lines: z
      .array(
        z.object({
          categoryId: z.string().min(1, 'MOVEMENT_LINE_CATEGORY_INVALID'),
          amount: z.string(),
        }),
      )
      .min(1, 'MOVEMENT_NO_LINES'),
  })
  .superRefine((values, context) => {
    // RN-20: valid amounts for the chosen currency (decimals, up to 12 integer digits).
    const total = parseAmountToMinor(values.total, values.currency);
    if (!total.ok) {
      context.addIssue({ code: 'custom', path: ['total'], message: total.error });
    } else if (total.value <= 0) {
      context.addIssue({ code: 'custom', path: ['total'], message: 'MOVEMENT_TOTAL_INVALID' });
    }

    values.lines.forEach((line, index) => {
      const amount = parseAmountToMinor(line.amount, values.currency);
      if (!amount.ok) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'amount'],
          message: amount.error,
        });
      } else if (amount.value <= 0) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'amount'],
          message: 'MOVEMENT_LINE_AMOUNT_INVALID',
        });
      }
    });
  });

export type MovementFormValues = z.infer<typeof movementFormSchema>;
