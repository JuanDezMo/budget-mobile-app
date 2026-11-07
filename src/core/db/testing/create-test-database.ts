import BetterSqlite3 from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';

import type { AppDatabase, Database } from '../database.types';
import { migrateToLatest } from '../migrate';

// A fresh in-memory SQLite for tests, with every migration applied.
// expo-sqlite is native and cannot run in Jest, so tests use better-sqlite3 instead.
// Same SQL, same STRICT tables, same triggers (decided in T1.11).
export async function createTestDatabase(): Promise<AppDatabase> {
  const sqlite = new BetterSqlite3(':memory:');
  sqlite.pragma('foreign_keys = ON');

  const db = new Kysely<Database>({ dialect: new SqliteDialect({ database: sqlite }) });
  await migrateToLatest(db);

  return db;
}
