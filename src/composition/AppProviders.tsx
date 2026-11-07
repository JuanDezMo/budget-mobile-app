import { getLocales } from 'expo-localization';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { openDatabase } from '@/core/db/connection';
import { initI18n, setAppLanguage } from '@/core/i18n/i18n';
import { AppText } from '@/core/theme/AppText';
import { Screen } from '@/core/theme/Screen';
import { ThemeProvider } from '@/core/theme/ThemeProvider';
import { createSettingsRepository } from '@/features/settings/settings.repository';
import type { SettingsRepository } from '@/features/settings/settings.repository';
import { loadSettings, useSettingsStore } from '@/features/settings/useSettings';
import { SettingsRepositoryProvider } from '@/features/settings/useSettingsRepository';

type Repositories = { settings: SettingsRepository };
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
        if (!cancelled) setBoot({ status: 'ready', repos: { settings: settingsRepository } });
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
      <ThemedRoot>{children}</ThemedRoot>
    </SettingsRepositoryProvider>
  );
}

function ThemedRoot({ children }: { children: ReactNode }) {
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
