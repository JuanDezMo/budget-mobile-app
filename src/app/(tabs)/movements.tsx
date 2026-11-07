import { useTranslation } from 'react-i18next';

import { AppText } from '@/core/theme/AppText';
import { Screen } from '@/core/theme/Screen';

// Placeholder until movements exist (iteration 4).
export default function MovementsScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <AppText variant="title">{t('navigation.movements')}</AppText>
      <AppText variant="muted">{t('movements.empty')}</AppText>
    </Screen>
  );
}
