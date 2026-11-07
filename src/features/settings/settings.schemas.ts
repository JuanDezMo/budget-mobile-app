import { z } from 'zod';

import { APP_LANGUAGES, THEME_MODES } from '@/core/shared/app-preferences';

export const settingsUpdateSchema = z.object({
  language: z.enum(APP_LANGUAGES).optional(),
  theme: z.enum(THEME_MODES).optional(),
});
