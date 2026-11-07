import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { err, ok } from '@/core/shared/result';
import type { Result } from '@/core/shared/result';

import { grantAccess } from './useAccess';
import { registrationSchema } from './profile.schemas';
import type { RegistrationInput } from './profile.schemas';
import { usePinVault, useProfileRepository } from './useProfileDependencies';

export type RegistrationError = 'INVALID' | 'UNEXPECTED';

const EMPTY_FORM: RegistrationInput = {
  fullName: '',
  email: '',
  countryCode: '',
  pin: '',
  pinConfirmation: '',
};

// First launch: creates the profile and the PIN (RN-42, RN-43) and opens the app.
export function useRegistration() {
  const repository = useProfileRepository();
  const vault = usePinVault();

  async function register(input: RegistrationInput): Promise<Result<void, RegistrationError>> {
    const parsed = registrationSchema.safeParse(input);
    if (!parsed.success) return err('INVALID');
    const { pin, fullName, email, countryCode } = parsed.data;

    try {
      // A PIN left by a previous install (iOS Keychain survives uninstall) is discarded.
      await vault.clear();
      await vault.setPin(pin);
      try {
        const profile = await repository.create({ fullName, email, countryCode });
        grantAccess(profile);
      } catch (error) {
        await vault.clear(); // do not leave a PIN without a profile
        throw error;
      }

      return ok(undefined);
    } catch {
      return err('UNEXPECTED');
    }
  }

  // The form lives here (not in the component) so the screen only paints and sends events.
  const form = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: EMPTY_FORM,
  });
  const [failure, setFailure] = useState<RegistrationError | null>(null);

  const submit = form.handleSubmit(async (values) => {
    const result = await register(values);
    setFailure(result.ok ? null : result.error);
  });

  return { register, form, submit, failure };
}
