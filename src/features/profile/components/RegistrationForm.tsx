import Constants from 'expo-constants';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { BrandEnvelope } from '@/core/theme/BrandEnvelope';
import { PinInput } from '@/core/theme/PinInput';
import { PINNED_FOOTER_SPACE, PinnedFooter } from '@/core/theme/PinnedFooter';
import { PrimaryButton } from '@/core/theme/PrimaryButton';
import { SectionHeading } from '@/core/theme/SectionHeading';
import { TextField } from '@/core/theme/TextField';
import { useTheme } from '@/core/theme/ThemeProvider';

import { useRegistration } from '../useRegistration';
import { CountryPicker } from './CountryPicker';

// First-launch form: profile plus PIN (RN-42, RN-43). Errors are codes translated here.
// It opens with the brand envelope; the data and the PIN are two sections; the button is pinned.
export function RegistrationForm() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { form, submit, failure } = useRegistration();
  const {
    control,
    formState: { errors, isSubmitting },
  } = form;

  const message = (code: string | undefined) => (code ? t(`errors.${code}`) : undefined);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <BrandEnvelope
          title={Constants.expoConfig?.name ?? ''}
          subtitle={t('registration.title')}
        />
        <AppText variant="muted">{t('registration.intro')}</AppText>

        <SectionHeading title={t('registration.sections.data')} style={styles.heading} />
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

        <SectionHeading title={t('registration.sections.pin')} style={styles.heading} />
        <Controller
          control={control}
          name="pin"
          render={({ field }) => (
            <PinInput
              label={t('registration.pin')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={message(errors.pin?.message)}
            />
          )}
        />
        <Controller
          control={control}
          name="pinConfirmation"
          render={({ field }) => (
            <PinInput
              label={t('registration.pinConfirmation')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={message(errors.pinConfirmation?.message)}
            />
          )}
        />
        {/* RN-46: said next to the PIN, before it is created, in a note that stands out. */}
        <View style={[styles.warning, { borderColor: colors.line }]}>
          <AppText variant="muted">{t('registration.pinWarning')}</AppText>
        </View>
        {failure ? (
          <AppText style={{ color: colors.over }}>
            {t(`errors.${failure === 'INVALID' ? 'INVALID' : 'UNEXPECTED'}`)}
          </AppText>
        ) : null}
      </ScrollView>
      <PinnedFooter>
        <PrimaryButton
          tone="ink"
          label={t('registration.submit')}
          onPress={() => void submit()}
          disabled={isSubmitting}
        />
      </PinnedFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  form: { gap: 14, paddingBottom: PINNED_FOOTER_SPACE },
  heading: { marginTop: 8 },
  warning: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 12 },
});
