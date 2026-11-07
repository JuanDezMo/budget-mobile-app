// Built-in categories (RN-34). They are never renamed or deleted; their visible name comes
// from the translation `categories.<CODE>`.
export const SYSTEM_CATEGORY_CODES = [
  'ALIMENTACION',
  'TRANSPORTE',
  'ENTRETENIMIENTO',
  'URGENCIAS',
  'OBLIGACIONES_HOGAR',
  'SIN_CLASIFICAR',
] as const;

export type SystemCategoryCode = (typeof SYSTEM_CATEGORY_CODES)[number];

// RN-40: lines without a chosen category fall here; it never gets a budget.
export const UNCLASSIFIED_CODE: SystemCategoryCode = 'SIN_CLASIFICAR';
