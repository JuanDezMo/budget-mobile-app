import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { Screen } from '@/core/theme/Screen';
import { useTheme } from '@/core/theme/ThemeProvider';
import { FONT_FAMILY } from '@/core/theme/typography';
import { SettingsForm } from '@/features/settings/components/SettingsForm';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Screen>
      <AppText variant="title">{t('settings.title')}</AppText>
      <SettingsForm />
      <Link href="/categories" style={[styles.link, { color: colors.link }]}>
        {t('categories.link')}
      </Link>
      <Link href="/profile" style={[styles.link, { color: colors.link }]}>
        {t('profile.link')}
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { marginTop: 20, fontSize: 16, fontFamily: FONT_FAMILY.semibold },
});
