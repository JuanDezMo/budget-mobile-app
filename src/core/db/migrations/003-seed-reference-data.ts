import type { Kysely } from 'kysely';
import type { Migration } from 'kysely/migration';

import type { Database } from '../database.types';
import { SEED_CURRENCIES, SEED_SYSTEM_CATEGORIES } from '../seed-data';

export const seedReferenceData: Migration = {
  async up(db: Kysely<unknown>) {
    const typedDb = db as Kysely<Database>;
    const now = new Date().toISOString();

    await typedDb
      .insertInto('currency')
      .values(SEED_CURRENCIES.map((currency) => ({ ...currency })))
      .execute();

    await typedDb
      .insertInto('category')
      .values(
        SEED_SYSTEM_CATEGORIES.map((category) => ({
          id: category.id,
          code: category.code,
          name: null,
          icon: category.icon,
          color: category.color,
          is_system: 1,
          archived_at: null,
          created_at: now,
          updated_at: now,
        })),
      )
      .execute();
  },
};
