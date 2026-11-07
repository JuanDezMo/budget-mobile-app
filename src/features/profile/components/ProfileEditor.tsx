import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { PrimaryButton } from '@/core/theme/PrimaryButton';
import { TextField } from '@/core/theme/TextField';

import { useProfileSettings } from '../useProfileSettings';
import { CountryPicker } from './CountryPicker';

// Edit profile and change PIN (RN-47). Both need the current PIN.
export function ProfileEditor() {
  const { t } = useTranslation();
  const { profile, updateProfile, changePin } = useProfileSettings();
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [countryCode, setCountryCode] = useState(profile?.countryCode ?? '');
  const [currentPin, setCurrentPin] = useState('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [pinCurrent, setPinCurrent] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  async function saveProfile() {
    const result = await updateProfile({ fullName, email, countryCode }, currentPin);
    setCurrentPin('');
    setProfileMessage(result.ok ? t('profile.saved') : t(`errors.${result.error}`));
  }

  async function submitPin() {
    const result = await changePin({ currentPin: pinCurrent, newPin, confirmation });
    setPinCurrent('');
    if (result.ok) {
      setNewPin('');
      setConfirmation('');
    }
    setPinMessage(result.ok ? t('profile.saved') : t(`errors.${result.error}`));
  }

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
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
      <TextField
        label={t('profile.currentPin')}
        value={currentPin}
        onChangeText={setCurrentPin}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
      />
      {profileMessage ? <AppText variant="muted">{profileMessage}</AppText> : null}
      <PrimaryButton
        label={t('profile.save')}
        onPress={() => void saveProfile()}
        disabled={currentPin.length < 4}
      />

      <AppText variant="title">{t('profile.changePin')}</AppText>
      <TextField
        label={t('profile.currentPin')}
        value={pinCurrent}
        onChangeText={setPinCurrent}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
      />
      <TextField
        label={t('profile.newPin')}
        value={newPin}
        onChangeText={setNewPin}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
      />
      <TextField
        label={t('profile.newPinConfirmation')}
        value={confirmation}
        onChangeText={setConfirmation}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
      />
      {pinMessage ? <AppText variant="muted">{pinMessage}</AppText> : null}
      <PrimaryButton
        label={t('profile.changePinSubmit')}
        onPress={() => void submitPin()}
        disabled={pinCurrent.length < 4}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({ form: { gap: 16, paddingBottom: 32 } });
