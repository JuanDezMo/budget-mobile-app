import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { PrimaryButton } from '@/core/theme/PrimaryButton';
import { TextField } from '@/core/theme/TextField';
import { useTheme } from '@/core/theme/ThemeProvider';

import { AUTOMATIC_THRESHOLD_PERCENTAGE } from '../alert.types';
import type { ThresholdDraft } from '../useThresholdDraft';

// Up to 3 alert thresholds for a budget (RN-24). The 100% is always on and cannot be removed (RN-25).
export function ThresholdEditor({ draft }: { draft: ThresholdDraft }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <AppText variant="muted">{t('alerts.thresholds.title')}</AppText>
      {draft.texts.map((text, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.field}>
            <TextField
              label={`${t('alerts.thresholds.label')} ${index + 1}`}
              value={text}
              onChangeText={(value) => draft.setText(index, value)}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
          <PrimaryButton
            label={`${t('alerts.thresholds.remove')} ${index + 1}`}
            onPress={() => draft.remove(index)}
            tone="danger"
          />
        </View>
      ))}
      {draft.canAdd ? (
        <PrimaryButton label={t('alerts.thresholds.add')} onPress={draft.add} />
      ) : null}
      <AppText variant="muted">
        {t('alerts.thresholds.automatic', { percent: AUTOMATIC_THRESHOLD_PERCENTAGE })}
      </AppText>
      {draft.error ? (
        <AppText style={{ color: colors.over }}>{t(`errors.${draft.error}`)}</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  field: { flex: 1 },
});
