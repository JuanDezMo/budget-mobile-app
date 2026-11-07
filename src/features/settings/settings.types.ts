import type { AppLanguage, ThemeMode } from '@/core/shared/app-preferences';

// App preferences (RN-37). There is no default currency: it is chosen in each budget.
export type Settings = {
  language: AppLanguage;
  theme: ThemeMode;
};

// Any subset of the settings; fields left out stay as they were.
export type SettingsUpdate = Partial<Settings>;
