import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/core/theme/AppText';
import { useTheme } from '@/core/theme/ThemeProvider';

import { dismissInAppAlert, useInAppAlertsStore } from './in-app-alerts';

// Alerts shown inside the app when the system notification cannot be used (RN-31).
// It floats over the top of the screen and does not move the content.
export function InAppAlertBanner() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const alerts = useInAppAlertsStore((state) => state.alerts);
  if (alerts.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      {alerts.map((alert) => (
        <View
          key={alert.id}
          accessibilityRole="alert"
          style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.manila }]}
        >
          <View style={styles.text}>
            <AppText weight="bold">{alert.title}</AppText>
            <AppText variant="muted">{alert.body}</AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('alerts.dismiss')}
            onPress={() => dismissInAppAlert(alert.id)}
            style={styles.dismiss}
          >
            <AppText>{t('alerts.dismiss')}</AppText>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 10,
  },
  banner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: { flex: 1, gap: 2 },
  dismiss: { minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center' },
});
