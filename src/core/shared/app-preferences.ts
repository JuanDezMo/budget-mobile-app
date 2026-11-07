// User preferences shared by settings, i18n and theme (RN-37).
export const APP_LANGUAGES = ['es', 'en'] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: AppLanguage = 'es';

export function isAppLanguage(value: unknown): value is AppLanguage {
  return APP_LANGUAGES.some((language) => language === value);
}

// First launch: follow the device language when we have it, otherwise the default.
export function resolveInitialLanguage(deviceLanguageCode: string | null | undefined): AppLanguage {
  return isAppLanguage(deviceLanguageCode) ? deviceLanguageCode : DEFAULT_LANGUAGE;
}

export const THEME_MODES = ['LIGHT', 'DARK', 'SYSTEM'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
export const DEFAULT_THEME_MODE: ThemeMode = 'SYSTEM';

export function isThemeMode(value: unknown): value is ThemeMode {
  return THEME_MODES.some((mode) => mode === value);
}
