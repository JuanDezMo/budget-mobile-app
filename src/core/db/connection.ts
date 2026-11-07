import { Kysely } from 'kysely';
import { ExpoDialect } from 'kysely-expo';

import type { AppDatabase, Database } from './database.types';
import { migrateToLatest } from './migrate';

const DATABASE_FILE = 'adjusting-my-money.db';

// Opens the on-device SQLite file and brings it up to date. Call once at startup.
// kysely-expo turns on foreign keys and adds STRICT to tables created with the schema builder.
export async function openDatabase(): Promise<AppDatabase> {
  const db = new Kysely<Database>({ dialect: new ExpoDialect({ database: DATABASE_FILE }) });
  await migrateToLatest(db);

  return db;
}
