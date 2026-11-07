import { beforeEach, describe, expect, it } from '@jest/globals';

import { createTestDatabase } from '@/core/db/testing/create-test-database';

import { settingsUpdateSchema } from './settings.schemas';
import { createInMemorySettingsRepository, createSettingsRepository } from './settings.repository';
import type { SettingsRepository } from './settings.repository';
import type { Settings } from './settings.types';

const defaults: Settings = { language: 'es', theme: 'SYSTEM' };

// The same behavior must hold for the SQLite repository and the in-memory one.
const implementations: [string, () => Promise<SettingsRepository>][] = [
  ['sqlite', async () => createSettingsRepository(await createTestDatabase())],
  ['in-memory', () => Promise.resolve(createInMemorySettingsRepository())],
];

describe.each(implementations)('SettingsRepository (%s)', (_name, create) => {
  let repository: SettingsRepository;

  beforeEach(async () => {
    repository = await create();
  });

  it('RN-37 ensureDefaults creates the first row with the given language and theme', async () => {
    await repository.ensureDefaults({ language: 'en', theme: 'DARK' });

    expect(await repository.get()).toEqual({ language: 'en', theme: 'DARK' });
  });

  it('ensureDefaults never overwrites what the user already chose', async () => {
    await repository.ensureDefaults(defaults);
    await repository.update({ language: 'en' });
    await repository.ensureDefaults({ language: 'es', theme: 'LIGHT' });

    expect(await repository.get()).toEqual({ language: 'en', theme: 'SYSTEM' });
  });

  it('RN-37 update changes only the fields given and returns the result', async () => {
    await repository.ensureDefaults(defaults);

    expect(await repository.update({ theme: 'DARK' })).toEqual({ language: 'es', theme: 'DARK' });
    expect(await repository.update({ language: 'en' })).toEqual({ language: 'en', theme: 'DARK' });
  });

  it('get fails clearly when the app forgot to call ensureDefaults', async () => {
    await expect(repository.get()).rejects.toThrow('Settings row is missing');
  });
});

describe('settingsUpdateSchema', () => {
  it('RN-37 accepts valid languages and themes', () => {
    expect(settingsUpdateSchema.safeParse({ language: 'en', theme: 'LIGHT' }).success).toBe(true);
    expect(settingsUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('RN-37 rejects unknown languages and themes', () => {
    expect(settingsUpdateSchema.safeParse({ language: 'fr' }).success).toBe(false);
    expect(settingsUpdateSchema.safeParse({ theme: 'AUTO' }).success).toBe(false);
  });
});
