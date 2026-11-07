import { DEFAULT_THEME_MODE, resolveInitialLanguage } from '@/core/shared/app-preferences';

import type { Settings } from './settings.types';

// RN-37: on first launch the language follows the device (es or en, otherwise es)
// and the theme follows the system.
export function buildDefaultSettings(deviceLanguageCode: string | null | undefined): Settings {
  return { language: resolveInitialLanguage(deviceLanguageCode), theme: DEFAULT_THEME_MODE };
}
