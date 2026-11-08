import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { useTheme } from '@/core/theme/ThemeProvider';
import { FONT_FAMILY } from '@/core/theme/typography';

import { AUTOMATIC_THRESHOLD_PERCENTAGE } from '../alert.types';
import type { ThresholdDraft } from '../useThresholdDraft';

const REMOVE_SYMBOL = '✕'; // a symbol, not a word: the button's label is the translated text

// Up to 3 alert thresholds for a budget (RN-24), as chips: "50 % ✕", "90 % ✕", "＋ Alerta".
// Each one appears as a band on the envelope preview. The 100 % is always on (RN-25).
export function ThresholdEditor({ draft }: { draft: ThresholdDraft }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const lastIndex = draft.texts.length - 1;

  return (
    <View style={styles.wrap}>
      <AppText variant="muted">{t('alerts.thresholds.title')}</AppText>
      <View style={styles.chips}>
        {draft.texts.map((text, index) => (
          <View
            key={index}
            style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <TextInput
              accessibilityLabel={`${t('alerts.thresholds.label')} ${index + 1}`}
              value={text}
              onChangeText={(value) => draft.setText(index, value)}
              keyboardType="number-pad"
              maxLength={3}
              // A chip just added is empty: the keyboard opens on it right away.
              autoFocus={text === '' && index === lastIndex}
              placeholder="0"
              placeholderTextColor={colors.mute}
              style={[styles.input, { color: colors.ink, fontFamily: FONT_FAMILY.bold }]}
            />
            <AppText weight="bold">%</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('alerts.thresholds.remove')} ${index + 1}`}
              onPress={() => draft.remove(index)}
              hitSlop={8}
              style={styles.remove}
            >
              <AppText variant="muted" weight="bold">
                {REMOVE_SYMBOL}
              </AppText>
            </Pressable>
          </View>
        ))}
        {draft.canAdd ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('alerts.thresholds.add')}
            onPress={draft.add}
            style={[styles.chip, styles.add, { borderColor: colors.line }]}
          >
            <AppText weight="bold" style={{ color: colors.link }}>
              {`＋ ${t('alerts.thresholds.addShort')}`}
            </AppText>
          </Pressable>
        ) : null}
      </View>
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
  wrap: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  add: { borderStyle: 'dashed', paddingRight: 14 },
  input: { minWidth: 30, fontSize: 16, paddingVertical: 0, textAlign: 'right' },
  remove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
