import { Migrator } from 'kysely/migration';

import type { AppDatabase } from './database.types';
import { migrationProvider } from './migrations';

// Applies pending migrations. Throws if one fails: the app cannot run on a half-built database.
export async function migrateToLatest(db: AppDatabase): Promise<void> {
  const migrator = new Migrator({ db, provider: migrationProvider });
  const { error } = await migrator.migrateToLatest();

  if (error) throw error instanceof Error ? error : new Error('Database migration failed');
}
