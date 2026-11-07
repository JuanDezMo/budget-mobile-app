import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { FONT_FAMILY } from '@/core/theme/typography';

type IconName = keyof typeof Ionicons.glyphMap;

// The icon is outlined when the tab is not active and filled when it is, as in the sketches.
function tabIcon(filled: IconName, outline: IconName) {
  return function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    return (
      <Ionicons
        name={focused ? filled : outline}
        size={24}
        color={typeof color === 'string' ? color : undefined}
      />
    );
  };
}

// Four tabs, in the order of the visual direction (src-app.md): home, movements, budgets
// (the envelopes) and settings.
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
        tabBarLabelStyle: { fontSize: 12, fontFamily: FONT_FAMILY.semibold },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('navigation.home'), tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="movements"
        options={{
          title: t('navigation.movements'),
          tabBarIcon: tabIcon('swap-horizontal', 'swap-horizontal-outline'),
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{ title: t('navigation.budgets'), tabBarIcon: tabIcon('mail', 'mail-outline') }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('navigation.settings'),
          tabBarIcon: tabIcon('settings', 'settings-outline'),
        }}
      />
    </Tabs>
  );
}
