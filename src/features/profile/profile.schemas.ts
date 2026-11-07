import { z } from 'zod';

import { isCountryCode } from '@/core/shared/countries';

// Messages are error codes: the screen shows t(`errors.${code}`).

// RN-43: 4 to 6 digits.
export const pinSchema = z.string().regex(/^\d{4,6}$/, 'PIN_INVALID');

// RN-42: name, email and country are required.
export const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'FULL_NAME_REQUIRED').max(80, 'FULL_NAME_TOO_LONG'),
  email: z.string().trim().pipe(z.email('EMAIL_INVALID')),
  countryCode: z.string().refine((code): boolean => isCountryCode(code), 'COUNTRY_INVALID'),
});

// RN-42 + RN-43: registration also creates the PIN, typed twice.
export const registrationSchema = profileSchema
  .extend({ pin: pinSchema, pinConfirmation: z.string() })
  .refine((data) => data.pin === data.pinConfirmation, {
    path: ['pinConfirmation'],
    message: 'PIN_MISMATCH',
  });

// RN-47: editing the profile needs the current PIN.
export const profileUpdateSchema = profileSchema.partial();

// RN-47: changing the PIN needs the current one and a confirmed new one.
export const changePinSchema = z
  .object({
    currentPin: z.string().min(1, 'PIN_INVALID'),
    newPin: pinSchema,
    confirmation: z.string(),
  })
  .refine((data) => data.newPin === data.confirmation, {
    path: ['confirmation'],
    message: 'PIN_MISMATCH',
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type ChangePinInput = z.infer<typeof changePinSchema>;
