import { useTranslation } from 'react-i18next';

import { AppText } from '@/core/theme/AppText';
import { Screen } from '@/core/theme/Screen';

// Placeholder until budgets exist (iteration 3).
export default function BudgetsScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <AppText variant="title">{t('navigation.budgets')}</AppText>
      <AppText variant="muted">{t('budgets.empty')}</AppText>
    </Screen>
  );
}
