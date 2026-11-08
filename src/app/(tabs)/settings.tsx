import type { Href } from 'expo-router';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { Screen } from '@/core/theme/Screen';
import { SectionHeading } from '@/core/theme/SectionHeading';
import { useTheme } from '@/core/theme/ThemeProvider';
import { SettingsForm } from '@/features/settings/components/SettingsForm';

// A symbol, not text: the row's meaning is in its title.
const CHEVRON = '›';

type AccountLink = { href: Href; title: string; hint: string };

// Settings: the preferences (language and theme) and, below, the account screens as rows of one
// block, like the category list.
export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const links: AccountLink[] = [
    {
      href: '/categories',
      title: t('categories.link'),
      hint: t('settings.links.categoriesHint'),
    },
    { href: '/profile', title: t('profile.link'), hint: t('settings.links.profileHint') },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title">{t('settings.title')}</AppText>
        <SettingsForm />
        <View style={styles.section}>
          <SectionHeading title={t('settings.sections.account')} />
          <View style={[styles.block, { backgroundColor: colors.surface }]}>
            {links.map((link, index) => (
              <Pressable
                key={link.title}
                accessibilityRole="link"
                accessibilityLabel={link.title}
                accessibilityHint={link.hint}
                onPress={() => router.push(link.href)}
                style={[
                  styles.row,
                  { borderBottomColor: colors.line },
                  index === links.length - 1 && styles.last,
                ]}
              >
                <View style={styles.rowText}>
                  <AppText weight="semibold">{link.title}</AppText>
                  <AppText variant="muted" style={styles.hint}>
                    {link.hint}
                  </AppText>
                </View>
                <AppText variant="muted" style={styles.chevron}>
                  {CHEVRON}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20, paddingBottom: 32 },
  section: { gap: 8 },
  block: { borderRadius: 12, overflow: 'hidden' },
  row: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  last: { borderBottomWidth: 0 },
  rowText: { flex: 1, gap: 2 },
  hint: { fontSize: 13 },
  chevron: { fontSize: 26 },
});
