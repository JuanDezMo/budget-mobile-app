import { err, ok } from '@/core/shared/result';
import type { Result } from '@/core/shared/result';
import { UNCLASSIFIED_CODE } from '@/core/shared/system-categories';

import type { Category, CustomCategory } from './category.types';

// Name as people compare it: no extra spaces, no case.
export function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

// RN-35: the name is unique among custom categories, ignoring case and spacing.
// `ignoreId` lets a category keep its own name when it is edited.
export function checkCategoryNameAvailable(
  name: string,
  categories: readonly Category[],
  ignoreId?: string,
): Result<string, 'CATEGORY_NAME_DUPLICATE'> {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  const taken = categories.some(
    (category) =>
      !category.isSystem &&
      category.id !== ignoreId &&
      normalizeCategoryName(category.name) === normalizeCategoryName(cleaned),
  );

  return taken ? err('CATEGORY_NAME_DUPLICATE') : ok(cleaned);
}

// RN-34: built-in categories cannot be renamed.
export function checkCanRename(
  category: Category,
): Result<CustomCategory, 'CATEGORY_SYSTEM_PROTECTED'> {
  return category.isSystem ? err('CATEGORY_SYSTEM_PROTECTED') : ok(category);
}

export type RemovalAction = 'ARCHIVE' | 'DELETE';

// RN-34 + RN-36: built-in categories stay. A custom one with history (budgets or movement
// lines) is archived so the history is kept; one with none is deleted.
export function decideRemoval(
  category: Category,
  hasHistory: boolean,
): Result<RemovalAction, 'CATEGORY_SYSTEM_PROTECTED' | 'CATEGORY_ALREADY_ARCHIVED'> {
  if (category.isSystem) return err('CATEGORY_SYSTEM_PROTECTED');
  if (category.archivedAt !== null) return err('CATEGORY_ALREADY_ARCHIVED');

  return ok(hasHistory ? 'ARCHIVE' : 'DELETE');
}

// RN-36: an archived category accepts no new budgets and no new movement lines.
export function checkCanReceiveLines(category: Category): Result<Category, 'CATEGORY_ARCHIVED'> {
  return category.archivedAt !== null ? err('CATEGORY_ARCHIVED') : ok(category);
}

// RN-40 + RN-36: SIN_CLASIFICAR never gets a budget, and neither does an archived category.
export function checkCanHaveBudget(
  category: Category,
): Result<Category, 'CATEGORY_ARCHIVED' | 'CATEGORY_NO_BUDGET_ALLOWED'> {
  if (category.isSystem && category.code === UNCLASSIFIED_CODE) {
    return err('CATEGORY_NO_BUDGET_ALLOWED');
  }
  if (category.archivedAt !== null) return err('CATEGORY_ARCHIVED');

  return ok(category);
}

// Text shown for a category. Built-in ones are translated by code; custom ones keep their name.
export function getCategoryLabel(category: Category, translate: (key: string) => string): string {
  return category.isSystem ? translate(`categories.${category.code}`) : category.name;
}
