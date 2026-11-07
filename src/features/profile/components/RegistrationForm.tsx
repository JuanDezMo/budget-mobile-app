import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { PrimaryButton } from '@/core/theme/PrimaryButton';
import { TextField } from '@/core/theme/TextField';

import { useRegistration } from '../useRegistration';
import { CountryPicker } from './CountryPicker';

// First-launch form: profile plus PIN (RN-42, RN-43). Errors are codes translated here.
export function RegistrationForm() {
  const { t } = useTranslation();
  const { form, submit, failure } = useRegistration();
  const {
    control,
    formState: { errors, isSubmitting },
  } = form;

  const message = (code: string | undefined) => (code ? t(`errors.${code}`) : undefined);

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <AppText variant="title">{t('registration.title')}</AppText>
      <AppText variant="muted">{t('registration.intro')}</AppText>

      <Controller
        control={control}
        name="fullName"
        render={({ field }) => (
          <TextField
            label={t('registration.fullName')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="words"
            autoComplete="name"
            error={message(errors.fullName?.message)}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label={t('registration.email')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={message(errors.email?.message)}
          />
        )}
      />
      <Controller
        control={control}
        name="countryCode"
        render={({ field }) => (
          <CountryPicker
            label={t('registration.country')}
            value={field.value}
            onChange={field.onChange}
            error={message(errors.countryCode?.message)}
          />
        )}
      />
      <Controller
        control={control}
        name="pin"
        render={({ field }) => (
          <TextField
            label={t('registration.pin')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
            error={message(errors.pin?.message)}
          />
        )}
      />
      <Controller
        control={control}
        name="pinConfirmation"
        render={({ field }) => (
          <TextField
            label={t('registration.pinConfirmation')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
            error={message(errors.pinConfirmation?.message)}
          />
        )}
      />

      <AppText variant="muted">{t('registration.pinWarning')}</AppText>
      {failure ? (
        <AppText>{t(`errors.${failure === 'INVALID' ? 'INVALID' : 'UNEXPECTED'}`)}</AppText>
      ) : null}
      <PrimaryButton
        label={t('registration.submit')}
        onPress={() => void submit()}
        disabled={isSubmitting}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({ form: { gap: 16, paddingBottom: 32 } });
