import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { APP_LANGUAGES, THEME_MODES } from '@/core/shared/app-preferences';
import { AppText } from '@/core/theme/AppText';
import { SectionHeading } from '@/core/theme/SectionHeading';
import { SegmentedControl } from '@/core/theme/SegmentedControl';
import { useTheme } from '@/core/theme/ThemeProvider';

import { useSettings } from '../useSettings';

// Language and theme choosers (RN-37), as one block of preferences. Changes are saved and applied
// right away. The segmented control is the quiet one of the forms, so manila stays for actions.
export function SettingsForm() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { settings, setLanguage, setTheme } = useSettings();
  if (!settings) return null;

  return (
    <View style={styles.section}>
      <SectionHeading title={t('settings.sections.preferences')} />
      <View style={[styles.block, { backgroundColor: colors.surface }]}>
        <View style={[styles.row, { borderBottomColor: colors.line }]}>
          <AppText variant="muted">{t('settings.language.label')}</AppText>
          <SegmentedControl
            label={t('settings.language.label')}
            options={APP_LANGUAGES.map((value) => ({
              value,
              label: t(`settings.language.${value}`),
            }))}
            selected={settings.language}
            onSelect={(language) => void setLanguage(language)}
          />
        </View>
        <View style={[styles.row, styles.last]}>
          <AppText variant="muted">{t('settings.theme.label')}</AppText>
          <SegmentedControl
            label={t('settings.theme.label')}
            options={THEME_MODES.map((value) => ({ value, label: t(`settings.theme.${value}`) }))}
            selected={settings.theme}
            onSelect={(theme) => void setTheme(theme)}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  block: { borderRadius: 12, overflow: 'hidden' },
  row: { padding: 14, gap: 10, borderBottomWidth: 1 },
  last: { borderBottomWidth: 0 },
});
