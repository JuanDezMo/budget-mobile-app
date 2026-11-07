import { useTranslation } from 'react-i18next';

import { AppText } from '@/core/theme/AppText';
import { Screen } from '@/core/theme/Screen';
import { ProfileEditor } from '@/features/profile/components/ProfileEditor';

export default function ProfileScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <AppText variant="title">{t('profile.title')}</AppText>
      <ProfileEditor />
    </Screen>
  );
}
