import { getLocales } from 'expo-localization';
import {
  disableAppSwitcherProtectionAsync,
  enableAppSwitcherProtectionAsync,
  usePreventScreenCapture,
} from 'expo-screen-capture';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { openDatabase } from '@/core/db/connection';
import { initI18n, setAppLanguage } from '@/core/i18n/i18n';
import { AppText } from '@/core/theme/AppText';
import { Screen } from '@/core/theme/Screen';
import { ThemeProvider } from '@/core/theme/ThemeProvider';
import {
  createLineReassigner,
  createMovementRepository,
} from '@/features/movements/movement.repository';
import type { MovementRepository } from '@/features/movements/movement.repository';
import { budgetAssignmentRules } from '@/features/movements/movement.rules';
import { MovementRepositoryProvider } from '@/features/movements/useMovementRepository';
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
import { loadAccess, useAppLock } from '@/features/profile/useAccess';
import {
  PinVaultProvider,
  ProfileRepositoryProvider,
} from '@/features/profile/useProfileDependencies';
import { createDevicePinVault } from '@/core/security/device-security';
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
        const db = await openDatabase();
        const settingsRepository = createSettingsRepository(db);
        const settings = await loadSettings(settingsRepository, deviceLanguage);
        await setAppLanguage(settings.language);
        const profileRepository = createProfileRepository(db);
        await loadAccess(profileRepository);
        // RN-05: lazy close, applied every time the app opens.
        const budgetRepository = createBudgetRepository(
          db,
          newId,
          createLineReassigner(budgetAssignmentRules),
        );
        await closeExpiredBudgets(budgetRepository);
        const repos = {
          settings: settingsRepository,
          profile: profileRepository,
          categories: createCategoryRepository(db, newId),
          budgets: budgetRepository,
          movements: createMovementRepository(db, newId, budgetAssignmentRules),
          vault: createDevicePinVault(),
        };
        if (!cancelled) setBoot({ status: 'ready', repos });
      } catch {
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
                <ThemedRoot>{children}</ThemedRoot>
              </MovementRepositoryProvider>
            </BudgetRepositoryProvider>
          </CategoryRepositoryProvider>
        </PinVaultProvider>
      </ProfileRepositoryProvider>
    </SettingsRepositoryProvider>
  );
}

function ThemedRoot({ children }: { children: ReactNode }) {
  useAppLock(); // RN-44
  usePreventScreenCapture(); // Android: blank preview and no screenshots
  useEffect(() => {
    // iOS: blur the app in the app switcher so balances are not visible.
    void enableAppSwitcherProtectionAsync();
    return () => void disableAppSwitcherProtectionAsync();
  }, []);

  const theme = useSettingsStore((state) => state.settings?.theme ?? 'SYSTEM');

  return <ThemeProvider mode={theme}>{children}</ThemeProvider>;
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
