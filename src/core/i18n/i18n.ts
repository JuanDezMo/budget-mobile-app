import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';
import { DEFAULT_LANGUAGE, resolveInitialLanguage } from '@/core/shared/app-preferences';
import type { AppLanguage } from '@/core/shared/app-preferences';

// The single i18next instance of the app.
export const i18n = createInstance();

// Initializes the instance. Call once at startup, before the first render.
// The saved language (settings) is applied right after with `setAppLanguage`.
export async function initI18n(initialLanguage?: AppLanguage): Promise<void> {
  if (i18n.isInitialized) return;

  await i18n.use(initReactI18next).init({
    resources: { es: { translation: es }, en: { translation: en } },
    lng: initialLanguage ?? resolveInitialLanguage(getLocales()[0]?.languageCode),
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export async function setAppLanguage(language: AppLanguage): Promise<void> {
  await i18n.changeLanguage(language);
}

export function getAppLanguage(): AppLanguage {
  return resolveInitialLanguage(i18n.language);
}

// Translation outside React (notifications, error mapping). Components use `useTranslation`.
export function translate(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}
