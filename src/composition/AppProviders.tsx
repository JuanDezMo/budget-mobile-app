import { loadAsync } from 'expo-font';
import { getLocales } from 'expo-localization';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { openDatabase } from '@/core/db/connection';
import { initI18n, setAppLanguage, translate } from '@/core/i18n/i18n';
import { InAppAlertBanner } from '@/core/notifications/InAppAlertBanner';
import {
  createAlertDispatcher,
  setUpNotificationPermission,
} from '@/core/notifications/in-app-alerts';
import { configureNotifications, createExpoNotifier } from '@/core/notifications/notifier';
import type { Notifier } from '@/core/notifications/notifier';
import { AppText } from '@/core/theme/AppText';
import { Screen } from '@/core/theme/Screen';
import { ThemeProvider } from '@/core/theme/ThemeProvider';
import { FONT_FILES } from '@/core/theme/typography';
import {
  createLineReassigner,
  createMovementRepository,
} from '@/features/movements/movement.repository';
import type { MovementRepository } from '@/features/movements/movement.repository';
import { budgetAssignmentRules } from '@/features/movements/movement.rules';
import { MovementRepositoryProvider } from '@/features/movements/useMovementRepository';
import { createThresholdRepository } from '@/features/alerts/alert.repository';
import type { ThresholdRepository } from '@/features/alerts/alert.repository';
import {
  AlertActionsProvider,
  ThresholdRepositoryProvider,
} from '@/features/alerts/useAlertDependencies';
import type { AlertActions } from '@/features/alerts/useAlertDependencies';
import { createBudgetRepository } from '@/features/budgets/budget.repository';
import type { BudgetRepository } from '@/features/budgets/budget.repository';
import { closeExpiredBudgets } from '@/features/budgets/useBudgets';
import { BudgetRepositoryProvider } from '@/features/budgets/useBudgetRepository';
import { createCategoryRepository } from '@/features/categories/category.repository';
import type { CategoryRepository } from '@/features/categories/category.repository';
import { CategoryRepositoryProvider } from '@/features/categories/useCategoryRepository';
import { newId } from '@/core/shared/id';
import { createProfileRepository } from '@/features/profile/profile.repository';
import type { ProfileRepository } from '@/features/profile/profile.repository';
import { loadAccess, useAccessStore, useAppLock } from '@/features/profile/useAccess';
import {
  PinVaultProvider,
  ProfileRepositoryProvider,
} from '@/features/profile/useProfileDependencies';
import { createAlertWiring } from './alert-wiring';
import { createDevicePinVault } from '@/core/security/device-security';
import { useScreenPrivacy } from '@/core/security/screen-privacy';
import type { PinVault } from '@/core/security/pin-vault';
import { createSettingsRepository } from '@/features/settings/settings.repository';
import type { SettingsRepository } from '@/features/settings/settings.repository';
import { loadSettings, useSettingsStore } from '@/features/settings/useSettings';
import { SettingsRepositoryProvider } from '@/features/settings/useSettingsRepository';

type Repositories = {
  settings: SettingsRepository;
  profile: ProfileRepository;
  categories: CategoryRepository;
  budgets: BudgetRepository;
  movements: MovementRepository;
  thresholds: ThresholdRepository;
  alertActions: AlertActions;
  notifier: Notifier;
  vault: PinVault;
};
type Boot = { status: 'loading' } | { status: 'error' } | { status: 'ready'; repos: Repositories };

// Composition root: the only place that knows both the database and the features.
// It opens SQLite, runs migrations, loads the saved settings, and hands each ViewModel
// its repository through context. Nothing renders until the app is ready.
export function AppProviders({ children }: { children: ReactNode }) {
  const [boot, setBoot] = useState<Boot>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const deviceLanguage = getLocales()[0]?.languageCode;
        await initI18n(); // first, so even a startup error can be shown translated
        // The typography of the visual direction. If a font fails to load the app still opens,
        // with the system font.
        await loadAsync(FONT_FILES).catch((error: unknown) => {
          console.warn('Fonts failed to load', error);
        });
        const db = await openDatabase();
        const settingsRepository = createSettingsRepository(db);
        const settings = await loadSettings(settingsRepository, deviceLanguage);
        await setAppLanguage(settings.language);
        const profileRepository = createProfileRepository(db);
        await loadAccess(profileRepository);
        // Setting up notifications must never stop the app from opening: in Expo Go on Android the
        // channel call can fail. Without it alerts still reach the in-app banner (RN-31).
        await configureNotifications(translate('alerts.channelName')).catch((error: unknown) => {
          console.warn('Notification setup failed', error);
        });
        const notifier = createExpoNotifier();
        const thresholds = createThresholdRepository(db, newId);

        // The repositories tell the alert evaluator when a budget's usage may have changed
        // (RN-26, RN-39), and the evaluator needs the repositories to read the usage: the
        // listener is plugged in once both exist.
        let onBudgetsChanged: (budgetIds: readonly string[]) => Promise<void> = () =>
          Promise.resolve();
        const listener = (budgetIds: readonly string[]) => onBudgetsChanged(budgetIds);
        const budgetRepository = createBudgetRepository(
          db,
          newId,
          createLineReassigner(budgetAssignmentRules),
          listener,
        );
        const categoryRepository = createCategoryRepository(db, newId);
        const alertWiring = createAlertWiring({
          budgets: budgetRepository,
          categories: categoryRepository,
          thresholds,
          deliver: createAlertDispatcher(notifier),
        });
        onBudgetsChanged = alertWiring.onBudgetsChanged;

        // RN-05: lazy close, applied every time the app opens.
        await closeExpiredBudgets(budgetRepository);
        const repos = {
          settings: settingsRepository,
          profile: profileRepository,
          categories: categoryRepository,
          budgets: budgetRepository,
          movements: createMovementRepository(db, newId, budgetAssignmentRules, listener),
          thresholds,
          alertActions: { syncAfterThresholdEdit: alertWiring.syncAfterThresholdEdit },
          notifier,
          vault: createDevicePinVault(),
        };
        if (!cancelled) setBoot({ status: 'ready', repos });
      } catch (error) {
        // Never swallow a startup failure silently: without this line nobody can tell what broke.
        console.error('App startup failed', error);
        if (!cancelled) setBoot({ status: 'error' });
      }
    }

    void start();
    return () => {
      cancelled = true;
    };
  }, []);

  if (boot.status === 'loading') return null;
  if (boot.status === 'error') return <StartupError />;

  return (
    <SettingsRepositoryProvider value={boot.repos.settings}>
      <ProfileRepositoryProvider value={boot.repos.profile}>
        <PinVaultProvider value={boot.repos.vault}>
          <CategoryRepositoryProvider value={boot.repos.categories}>
            <BudgetRepositoryProvider value={boot.repos.budgets}>
              <MovementRepositoryProvider value={boot.repos.movements}>
                <ThresholdRepositoryProvider value={boot.repos.thresholds}>
                  <AlertActionsProvider value={boot.repos.alertActions}>
                    <ThemedRoot notifier={boot.repos.notifier}>{children}</ThemedRoot>
                  </AlertActionsProvider>
                </ThresholdRepositoryProvider>
              </MovementRepositoryProvider>
            </BudgetRepositoryProvider>
          </CategoryRepositoryProvider>
        </PinVaultProvider>
      </ProfileRepositoryProvider>
    </SettingsRepositoryProvider>
  );
}

function ThemedRoot({ children, notifier }: { children: ReactNode; notifier: Notifier }) {
  useAppLock(); // RN-44
  useScreenPrivacy();

  // Ask for notification permission once, when the user is inside the app for the first time
  // (not on the registration or PIN screens). A refusal is fine: alerts become banners (RN-31).
  const status = useAccessStore((state) => state.status);
  useEffect(() => {
    if (status === 'unlocked') void setUpNotificationPermission(notifier).catch(() => undefined);
  }, [status, notifier]);

  const theme = useSettingsStore((state) => state.settings?.theme ?? 'SYSTEM');

  return (
    <ThemeProvider mode={theme}>
      <View style={{ flex: 1 }}>
        {children}
        <InAppAlertBanner />
      </View>
    </ThemeProvider>
  );
}

function StartupError() {
  const { t } = useTranslation();

  return (
    <ThemeProvider mode="SYSTEM">
      <Screen>
        <AppText>{t('errors.UNEXPECTED')}</AppText>
      </Screen>
    </ThemeProvider>
  );
}
