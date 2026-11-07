import type { AppDatabase, SettingsTable } from '@/core/db/database.types';

import type { Settings, SettingsUpdate } from './settings.types';

export interface SettingsRepository {
  // Creates the single settings row on first launch; does nothing if it already exists.
  ensureDefaults(defaults: Settings): Promise<void>;
  get(): Promise<Settings>;
  update(change: SettingsUpdate): Promise<Settings>;
}

const SETTINGS_ID = 1;

// Row (snake_case) -> entity (camelCase).
function toSettings(row: SettingsTable): Settings {
  return { language: row.language, theme: row.theme };
}

export function createSettingsRepository(db: AppDatabase): SettingsRepository {
  async function get(): Promise<Settings> {
    const row = await db
      .selectFrom('settings')
      .selectAll()
      .where('id', '=', SETTINGS_ID)
      .executeTakeFirst();
    if (!row) throw new Error('Settings row is missing: call ensureDefaults at startup');

    return toSettings(row);
  }

  return {
    async ensureDefaults(defaults) {
      await db
        .insertInto('settings')
        .values({
          id: SETTINGS_ID,
          language: defaults.language,
          theme: defaults.theme,
          updated_at: new Date().toISOString(),
        })
        .onConflict((conflict) => conflict.column('id').doNothing())
        .execute();
    },

    get,

    async update(change) {
      await db
        .updateTable('settings')
        .set({ ...change, updated_at: new Date().toISOString() })
        .where('id', '=', SETTINGS_ID)
        .execute();

      return get();
    },
  };
}

// For tests of ViewModels and screens: same behavior, no database.
export function createInMemorySettingsRepository(initial?: Settings): SettingsRepository {
  let current: Settings | null = initial ?? null;

  function get(): Promise<Settings> {
    if (!current) return Promise.reject(new Error('Settings row is missing'));
    return Promise.resolve({ ...current });
  }

  return {
    ensureDefaults(defaults) {
      current ??= { ...defaults };
      return Promise.resolve();
    },
    get,
    update(change) {
      if (!current) return Promise.reject(new Error('Settings row is missing'));
      current = { ...current, ...change };
      return get();
    },
  };
}
