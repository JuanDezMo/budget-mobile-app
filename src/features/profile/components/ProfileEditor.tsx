import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { PinInput } from '@/core/theme/PinInput';
import { PrimaryButton } from '@/core/theme/PrimaryButton';
import { SectionHeading } from '@/core/theme/SectionHeading';
import { TextField } from '@/core/theme/TextField';
import { useTheme } from '@/core/theme/ThemeProvider';

import { useProfileSettings } from '../useProfileSettings';
import { CountryPicker } from './CountryPicker';

type Feedback = { ok: boolean; text: string };

// Edit profile and change PIN (RN-47), as two sections. Both need the current PIN.
export function ProfileEditor() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { profile, updateProfile, changePin } = useProfileSettings();
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [countryCode, setCountryCode] = useState(profile?.countryCode ?? '');
  const [currentPin, setCurrentPin] = useState('');
  const [profileMessage, setProfileMessage] = useState<Feedback | null>(null);

  const [pinCurrent, setPinCurrent] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pinMessage, setPinMessage] = useState<Feedback | null>(null);

  async function saveProfile() {
    const result = await updateProfile({ fullName, email, countryCode }, currentPin);
    setCurrentPin('');
    setProfileMessage(
      result.ok
        ? { ok: true, text: t('profile.saved') }
        : { ok: false, text: t(`errors.${result.error}`) },
    );
  }

  async function submitPin() {
    const result = await changePin({ currentPin: pinCurrent, newPin, confirmation });
    setPinCurrent('');
    if (result.ok) {
      setNewPin('');
      setConfirmation('');
    }
    setPinMessage(
      result.ok
        ? { ok: true, text: t('profile.saved') }
        : { ok: false, text: t(`errors.${result.error}`) },
    );
  }

  // Green when it worked, the "over" color when it did not.
  const feedback = (value: Feedback | null) =>
    value ? (
      <AppText weight="semibold" style={{ color: value.ok ? colors.positive : colors.over }}>
        {value.text}
      </AppText>
    ) : null;

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <SectionHeading title={t('profile.sections.data')} />
      <TextField
        label={t('registration.fullName')}
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />
      <TextField
        label={t('registration.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <CountryPicker
        label={t('registration.country')}
        value={countryCode}
        onChange={setCountryCode}
      />
      {/* RN-47: any change asks for the current PIN. */}
      <PinInput label={t('profile.currentPin')} value={currentPin} onChangeText={setCurrentPin} />
      {feedback(profileMessage)}
      <PrimaryButton
        tone="ink"
        label={t('profile.save')}
        onPress={() => void saveProfile()}
        disabled={currentPin.length < 4}
      />

      <SectionHeading title={t('profile.changePin')} style={styles.second} />
      <PinInput label={t('profile.currentPin')} value={pinCurrent} onChangeText={setPinCurrent} />
      <PinInput label={t('profile.newPin')} value={newPin} onChangeText={setNewPin} />
      <PinInput
        label={t('profile.newPinConfirmation')}
        value={confirmation}
        onChangeText={setConfirmation}
      />
      {feedback(pinMessage)}
      <PrimaryButton
        tone="ink"
        label={t('profile.changePinSubmit')}
        onPress={() => void submitPin()}
        disabled={pinCurrent.length < 4}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14, paddingTop: 4, paddingBottom: 32 },
  second: { marginTop: 20 },
});
