import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { APP_LANGUAGES, THEME_MODES } from '@/core/shared/app-preferences';
import { OptionGroup } from '@/core/theme/OptionGroup';

import { useSettings } from '../useSettings';

// Language and theme choosers (RN-37). Changes are saved and applied right away.
export function SettingsForm() {
  const { t } = useTranslation();
  const { settings, setLanguage, setTheme } = useSettings();
  if (!settings) return null;

  return (
    <View style={{ gap: 24 }}>
      <OptionGroup
        label={t('settings.language.label')}
        options={APP_LANGUAGES.map((value) => ({ value, label: t(`settings.language.${value}`) }))}
        selected={settings.language}
        onSelect={(language) => void setLanguage(language)}
      />
      <OptionGroup
        label={t('settings.theme.label')}
        options={THEME_MODES.map((value) => ({ value, label: t(`settings.theme.${value}`) }))}
        selected={settings.theme}
        onSelect={(theme) => void setTheme(theme)}
      />
    </View>
  );
}
