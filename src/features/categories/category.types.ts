import type { SystemCategoryCode } from '@/core/shared/system-categories';

// Icons are stored as keys and drawn by the UI (the key -> emoji map lives in components).
export const CATEGORY_ICON_KEYS = [
  'utensils',
  'bus',
  'film',
  'siren',
  'home',
  'help-circle',
  'paw',
  'heart',
  'shirt',
  'book',
  'gift',
  'plane',
  'wallet',
  'phone',
  'wrench',
  'star',
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

// Colors a custom category can use (RN-35). Stored as hexadecimal text.
export const CATEGORY_COLORS = [
  '#D9452A',
  '#2F66D8',
  '#23955E',
  '#7A4FD0',
  '#E3A21A',
  '#C2185B',
  '#00838F',
  '#6D4C41',
  '#546E7A',
  '#F57C00',
  '#388E3C',
  '#5C6570',
] as const;

type CategoryBase = {
  id: string;
  icon: string;
  color: string;
  archivedAt: string | null; // RN-36
};

// RN-34: built-in, named by its code (translated), never renamed or deleted.
export type SystemCategory = CategoryBase & { isSystem: true; code: SystemCategoryCode };

// RN-35: created by the user, with a unique name.
export type CustomCategory = CategoryBase & { isSystem: false; name: string };

export type Category = SystemCategory | CustomCategory;

export type NewCategory = { name: string; icon: string; color: string };
