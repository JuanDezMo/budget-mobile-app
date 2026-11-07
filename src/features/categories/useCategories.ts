import { useEffect, useState } from 'react';

import { translate } from '@/core/i18n/i18n';

import { err, ok } from '@/core/shared/result';
import type { Result } from '@/core/shared/result';

import {
  checkCanRename,
  checkCategoryNameAvailable,
  decideRemoval,
  getCategoryLabel,
} from './category.rules';
import type { RemovalAction } from './category.rules';
import { categoryNameSchema } from './category.schemas';
import type { Category } from './category.types';
import { useCategoryRepository } from './useCategoryRepository';

export type CategoryError =
  | 'CATEGORY_NAME_REQUIRED'
  | 'CATEGORY_NAME_TOO_LONG'
  | 'CATEGORY_NAME_DUPLICATE'
  | 'CATEGORY_SYSTEM_PROTECTED'
  | 'CATEGORY_ALREADY_ARCHIVED'
  | 'UNEXPECTED';

// List and manage categories (RN-34, RN-35, RN-36).
export function useCategories(refreshKey = 0) {
  const repository = useCategoryRepository();
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    let active = true;
    void repository.list().then((list) => {
      if (active) setCategories(list);
    });

    return () => {
      active = false;
    };
  }, [repository, refreshKey]);

  async function reload() {
    setCategories(await repository.list());
  }

  // RN-36: archives a category with history and deletes one with none.
  async function remove(id: string): Promise<Result<RemovalAction, CategoryError>> {
    try {
      const category = (await repository.list()).find((candidate) => candidate.id === id);
      if (!category) return err('UNEXPECTED');

      const decision = decideRemoval(category, await repository.hasHistory(id));
      if (!decision.ok) return decision;

      if (decision.value === 'ARCHIVE') await repository.archive(id);
      else await repository.delete(id);
      await reload();

      return decision;
    } catch {
      return err('UNEXPECTED');
    }
  }

  // RN-34 + RN-35: only custom categories, with a name nobody else uses.
  async function rename(id: string, name: string): Promise<Result<void, CategoryError>> {
    const parsed = categoryNameSchema.safeParse(name);
    if (!parsed.success) {
      return err(
        parsed.error.issues[0]?.message === 'CATEGORY_NAME_TOO_LONG'
          ? 'CATEGORY_NAME_TOO_LONG'
          : 'CATEGORY_NAME_REQUIRED',
      );
    }

    try {
      const all = await repository.list();
      const category = all.find((candidate) => candidate.id === id);
      if (!category) return err('UNEXPECTED');

      const allowed = checkCanRename(category);
      if (!allowed.ok) return allowed;
      const available = checkCategoryNameAvailable(parsed.data, all, id);
      if (!available.ok) return available;

      await repository.rename(id, available.value);
      await reload();

      return ok(undefined);
    } catch {
      return err('UNEXPECTED');
    }
  }

  const list = categories ?? [];

  return {
    isLoading: categories === null,
    system: list.filter((category) => category.isSystem),
    custom: list.filter((category) => !category.isSystem && category.archivedAt === null),
    archived: list.filter((category) => !category.isSystem && category.archivedAt !== null),
    // Name to show for a category, in the current language (built-in ones are translated).
    labelOf: (category: Category) => getCategoryLabel(category, translate),
    remove,
    rename,
    reload,
  };
}
