import Constants from 'expo-constants';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { BrandEnvelope } from '@/core/theme/BrandEnvelope';
import { PinInput } from '@/core/theme/PinInput';
import { PrimaryButton } from '@/core/theme/PrimaryButton';
import { useTheme } from '@/core/theme/ThemeProvider';

import { useUnlock } from '../useUnlock';

// Lock screen (RN-44): the brand envelope, the PIN as boxes, the wait after failed attempts (RN-45)
// and "forgot PIN" (RN-46). Forgetting erases everything, so it is a quiet link that still asks
// first, never a button as big as "Unlock".
export function UnlockForm() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { unlock, eraseEverything, waitSeconds } = useUnlock();
  const [pin, setPin] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const waiting = waitSeconds > 0;

  async function submit() {
    const result = await unlock(pin);
    setPin('');
    setErrorCode(result.ok ? null : result.error);
  }

  function confirmErase() {
    Alert.alert(t('unlock.eraseTitle'), t('unlock.eraseMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('unlock.eraseConfirm'),
        style: 'destructive',
        onPress: () => void eraseEverything(),
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <BrandEnvelope title={Constants.expoConfig?.name ?? ''} />
      <AppText weight="bold" style={styles.heading}>
        {t('unlock.title')}
      </AppText>
      <PinInput
        label={t('unlock.pin')}
        value={pin}
        onChangeText={setPin}
        autoFocus
        error={errorCode && !waiting ? t(`errors.${errorCode}`) : undefined}
      />
      {waiting ? (
        <AppText style={{ color: colors.over }}>
          {t('unlock.wait', { seconds: waitSeconds })}
        </AppText>
      ) : null}
      <PrimaryButton
        tone="ink"
        label={t('unlock.submit')}
        onPress={() => void submit()}
        disabled={waiting || pin.length < 4}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('unlock.forgot')}
        onPress={confirmErase}
        style={styles.forgot}
      >
        <AppText weight="semibold" style={{ color: colors.over }}>
          {t('unlock.forgot')}
        </AppText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16, paddingBottom: 32 },
  heading: { fontSize: 22, marginTop: 8 },
  forgot: { minHeight: 44, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 12 },
});
