import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { PrimaryButton } from '@/core/theme/PrimaryButton';
import { TextField } from '@/core/theme/TextField';

import { useUnlock } from '../useUnlock';

// Lock screen (RN-44): PIN, wait after failed attempts (RN-45) and "forgot PIN" (RN-46).
export function UnlockForm() {
  const { t } = useTranslation();
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
    <View style={styles.form}>
      <AppText variant="title">{t('unlock.title')}</AppText>
      <TextField
        label={t('unlock.pin')}
        value={pin}
        onChangeText={setPin}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
        error={errorCode && !waiting ? t(`errors.${errorCode}`) : undefined}
      />
      {waiting ? <AppText>{t('unlock.wait', { seconds: waitSeconds })}</AppText> : null}
      <PrimaryButton
        label={t('unlock.submit')}
        onPress={() => void submit()}
        disabled={waiting || pin.length < 4}
      />
      <PrimaryButton label={t('unlock.forgot')} onPress={confirmErase} tone="danger" />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 16 } });
