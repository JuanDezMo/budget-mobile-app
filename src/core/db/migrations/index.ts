import type { Migration, MigrationProvider } from 'kysely/migration';

import { initialSchema } from './001-initial-schema';
import { budgetOverlapTriggers } from './002-budget-overlap-triggers';
import { seedReferenceData } from './003-seed-reference-data';

// Kysely runs migrations in alphabetical order of these names and remembers which ran.
// Never edit one that already shipped: add a new one at the end.
export const migrations: Record<string, Migration> = {
  '001-initial-schema': initialSchema,
  '002-budget-overlap-triggers': budgetOverlapTriggers,
  '003-seed-reference-data': seedReferenceData,
};

export const migrationProvider: MigrationProvider = {
  getMigrations: () => Promise.resolve(migrations),
};
