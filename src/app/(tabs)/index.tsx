import { useTranslation } from 'react-i18next';

import { AppText } from '@/core/theme/AppText';
import { Screen } from '@/core/theme/Screen';

// Placeholder until the budget envelopes exist (iteration 3).
export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <AppText variant="title">{t('home.title')}</AppText>
      <AppText variant="muted">{t('home.empty')}</AppText>
    </Screen>
  );
}
