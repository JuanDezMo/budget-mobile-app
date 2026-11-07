import { z } from 'zod';

import { CATEGORY_COLORS, CATEGORY_ICON_KEYS } from './category.types';

export const MAX_CATEGORY_NAME_LENGTH = 30;

// Messages are error codes: the screen shows t(`errors.${code}`).
export const categoryNameSchema = z
  .string()
  .trim()
  .min(1, 'CATEGORY_NAME_REQUIRED')
  .max(MAX_CATEGORY_NAME_LENGTH, 'CATEGORY_NAME_TOO_LONG');

// RN-35: name, icon and color.
export const newCategorySchema = z.object({
  name: categoryNameSchema,
  icon: z.enum(CATEGORY_ICON_KEYS, { error: 'CATEGORY_ICON_REQUIRED' }),
  color: z.enum(CATEGORY_COLORS, { error: 'CATEGORY_COLOR_REQUIRED' }),
});
