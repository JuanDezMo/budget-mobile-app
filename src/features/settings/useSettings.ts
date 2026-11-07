import { create } from 'zustand';

import { setAppLanguage } from '@/core/i18n/i18n';
import type { AppLanguage, ThemeMode } from '@/core/shared/app-preferences';
import { err, ok } from '@/core/shared/result';
import type { Result } from '@/core/shared/result';

import type { SettingsRepository } from './settings.repository';
import { buildDefaultSettings } from './settings.rules';
import type { Settings } from './settings.types';
import { useSettingsRepository } from './useSettingsRepository';

// Small global state (Zustand): the root layout and the settings screen must see the same
// language and theme, so both read this store.
type SettingsStore = { settings: Settings | null };

export const useSettingsStore = create<SettingsStore>(() => ({ settings: null }));

// Startup: creates the first row if needed, loads the saved settings and puts them in the store.
export async function loadSettings(
  repository: SettingsRepository,
  deviceLanguageCode: string | null | undefined,
): Promise<Settings> {
  await repository.ensureDefaults(buildDefaultSettings(deviceLanguageCode));
  const settings = await repository.get();
  useSettingsStore.setState({ settings });

  return settings;
}

export type SettingsError = 'UNEXPECTED';

// ViewModel of the settings screen (RN-37).
export function useSettings() {
  const repository = useSettingsRepository();
  const settings = useSettingsStore((state) => state.settings);

  async function save(change: Partial<Settings>): Promise<Result<void, SettingsError>> {
    try {
      const saved = await repository.update(change);
      useSettingsStore.setState({ settings: saved });
      if (change.language) await setAppLanguage(saved.language);

      return ok(undefined);
    } catch {
      return err('UNEXPECTED');
    }
  }

  return {
    settings,
    setLanguage: (language: AppLanguage) => save({ language }),
    setTheme: (theme: ThemeMode) => save({ theme }),
  };
}
