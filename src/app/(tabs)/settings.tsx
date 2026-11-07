import { useTranslation } from 'react-i18next';

import { AppText } from '@/core/theme/AppText';
import { Screen } from '@/core/theme/Screen';
import { SettingsForm } from '@/features/settings/components/SettingsForm';

export default function SettingsScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <AppText variant="title">{t('settings.title')}</AppText>
      <SettingsForm />
    </Screen>
  );
}
