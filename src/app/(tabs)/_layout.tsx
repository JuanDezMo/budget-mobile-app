import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme/ThemeProvider';

// Four tabs, as in the visual direction (src-app.md). Icons come with the first real screens.
export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.mute,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('navigation.home') }} />
      <Tabs.Screen name="movements" options={{ title: t('navigation.movements') }} />
      <Tabs.Screen name="budgets" options={{ title: t('navigation.budgets') }} />
      <Tabs.Screen name="settings" options={{ title: t('navigation.settings') }} />
    </Tabs>
  );
}
