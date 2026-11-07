import type { AppDatabase, CategoryTable } from '@/core/db/database.types';
import { SYSTEM_CATEGORY_CODES } from '@/core/shared/system-categories';

import type { Category, NewCategory } from './category.types';

export interface CategoryRepository {
  // Built-in first, then custom ones by name; archived ones included.
  list(): Promise<Category[]>;
  create(input: NewCategory): Promise<Category>;
  rename(id: string, name: string): Promise<Category>;
  // Does any budget or movement line use this category? (RN-36)
  hasHistory(id: string): Promise<boolean>;
  archive(id: string): Promise<Category>;
  delete(id: string): Promise<void>;
}

// Row (snake_case) -> entity (camelCase). Rows that break the data model are an unexpected error.
function toCategory(row: CategoryTable): Category {
  const base = { id: row.id, icon: row.icon, color: row.color, archivedAt: row.archived_at };

  if (row.is_system === 1) {
    const code = SYSTEM_CATEGORY_CODES.find((candidate) => candidate === row.code);
    if (!code) throw new Error(`Unknown system category code: ${row.code}`);

    return { ...base, isSystem: true, code };
  }
  if (row.name === null) throw new Error(`Custom category ${row.id} has no name`);

  return { ...base, isSystem: false, name: row.name };
}

export function createCategoryRepository(
  db: AppDatabase,
  generateId: () => string,
): CategoryRepository {
  async function get(id: string): Promise<Category> {
    const row = await db.selectFrom('category').selectAll().where('id', '=', id).executeTakeFirst();
    if (!row) throw new Error(`Category ${id} not found`);

    return toCategory(row);
  }

  return {
    async list() {
      const rows = await db
        .selectFrom('category')
        .selectAll()
        .orderBy('is_system', 'desc')
        .orderBy('created_at')
        .orderBy('id')
        .execute();
      const categories = rows.map(toCategory);

      return [
        ...categories.filter((category) => category.isSystem),
        ...categories
          .filter((category) => !category.isSystem)
          .sort((a, b) => (a.isSystem ? '' : a.name).localeCompare(b.isSystem ? '' : b.name)),
      ];
    },

    async create(input) {
      const id = generateId();
      const now = new Date().toISOString();
      await db
        .insertInto('category')
        .values({
          id,
          code: null,
          name: input.name,
          icon: input.icon,
          color: input.color,
          is_system: 0,
          archived_at: null,
          created_at: now,
          updated_at: now,
        })
        .execute();

      return get(id);
    },

    async rename(id, name) {
      // `is_system = 0` is a last guard: built-in categories can never be renamed (RN-34).
      await db
        .updateTable('category')
        .set({ name, updated_at: new Date().toISOString() })
        .where('id', '=', id)
        .where('is_system', '=', 0)
        .execute();

      return get(id);
    },

    async hasHistory(id) {
      const inLines = await db
        .selectFrom('movement_line')
        .select('id')
        .where('category_id', '=', id)
        .limit(1)
        .executeTakeFirst();
      if (inLines) return true;

      const inBudgets = await db
        .selectFrom('budget')
        .select('id')
        .where('category_id', '=', id)
        .limit(1)
        .executeTakeFirst();

      return inBudgets !== undefined;
    },

    async archive(id) {
      const now = new Date().toISOString();
      await db
        .updateTable('category')
        .set({ archived_at: now, updated_at: now })
        .where('id', '=', id)
        .where('is_system', '=', 0)
        .execute();

      return get(id);
    },

    async delete(id) {
      await db.deleteFrom('category').where('id', '=', id).where('is_system', '=', 0).execute();
    },
  };
}

// For tests of ViewModels and screens: same behavior, no database.
// `withHistory` lists the ids that count as having budgets or movement lines.
export function createInMemoryCategoryRepository(
  initial: readonly Category[],
  generateId: () => string,
  withHistory: ReadonlySet<string> = new Set(),
): CategoryRepository {
  let categories: Category[] = [...initial];

  function find(id: string): Category {
    const category = categories.find((candidate) => candidate.id === id);
    if (!category) throw new Error(`Category ${id} not found`);

    return category;
  }

  function replace(updated: Category): Category {
    categories = categories.map((category) => (category.id === updated.id ? updated : category));
    return updated;
  }

  return {
    list: () =>
      Promise.resolve([
        ...categories.filter((category) => category.isSystem),
        ...categories
          .filter((category) => !category.isSystem)
          .sort((a, b) => (a.isSystem ? '' : a.name).localeCompare(b.isSystem ? '' : b.name)),
      ]),
    create(input) {
      const category: Category = {
        id: generateId(),
        isSystem: false,
        name: input.name,
        icon: input.icon,
        color: input.color,
        archivedAt: null,
      };
      categories = [...categories, category];

      return Promise.resolve(category);
    },
    rename(id, name) {
      const current = find(id);
      return Promise.resolve(current.isSystem ? current : replace({ ...current, name }));
    },
    hasHistory: (id) => Promise.resolve(withHistory.has(id)),
    archive(id) {
      const current = find(id);
      return Promise.resolve(
        current.isSystem ? current : replace({ ...current, archivedAt: new Date().toISOString() }),
      );
    },
    delete(id) {
      categories = categories.filter((category) => category.id !== id || category.isSystem);
      return Promise.resolve();
    },
  };
}
