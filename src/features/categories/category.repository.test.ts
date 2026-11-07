import { beforeEach, describe, expect, it } from '@jest/globals';

import type { AppDatabase } from '@/core/db/database.types';
import { SEED_SYSTEM_CATEGORIES } from '@/core/db/seed-data';
import { createTestDatabase } from '@/core/db/testing/create-test-database';

import { createCategoryRepository, createInMemoryCategoryRepository } from './category.repository';
import type { CategoryRepository } from './category.repository';
import type { Category } from './category.types';

const input = { name: 'Mascotas', icon: 'paw', color: '#7A4FD0' };
const NOW = '2026-11-06T10:00:00-05:00';

function counter() {
  let n = 0;
  return () => `custom-${(n += 1)}`;
}

const seeded: Category[] = SEED_SYSTEM_CATEGORIES.map((c) => ({
  id: c.id,
  isSystem: true,
  code: c.code,
  icon: c.icon,
  color: c.color,
  archivedAt: null,
}));

// The same behavior must hold for the SQLite repository and the in-memory one.
const implementations: [string, () => Promise<CategoryRepository>][] = [
  ['sqlite', async () => createCategoryRepository(await createTestDatabase(), counter())],
  ['in-memory', () => Promise.resolve(createInMemoryCategoryRepository(seeded, counter()))],
];

describe.each(implementations)('CategoryRepository (%s)', (_name, create) => {
  let repository: CategoryRepository;

  beforeEach(async () => {
    repository = await create();
  });

  it('RN-34 lists the 6 built-in categories first, identified by code', async () => {
    const list = await repository.list();

    expect(list).toHaveLength(6);
    expect(list.every((category) => category.isSystem)).toBe(true);
    expect(list.map((c) => (c.isSystem ? c.code : null))).toContain('SIN_CLASIFICAR');
  });

  it('RN-35 creates a custom category with name, icon and color', async () => {
    const created = await repository.create(input);

    expect(created).toMatchObject({
      isSystem: false,
      name: 'Mascotas',
      icon: 'paw',
      color: '#7A4FD0',
    });
    expect(created.archivedAt).toBeNull();
    expect((await repository.list()).at(-1)).toEqual(created);
  });

  it('lists custom categories after the built-in ones, by name', async () => {
    await repository.create({ ...input, name: 'Zapatos' });
    await repository.create({ ...input, name: 'Arte' });

    const names = (await repository.list()).slice(6).map((c) => (c.isSystem ? '' : c.name));
    expect(names).toEqual(['Arte', 'Zapatos']);
  });

  it('RN-34 never renames a built-in category', async () => {
    const [transport] = (await repository.list()).filter(
      (c) => c.isSystem && c.code === 'TRANSPORTE',
    );
    if (!transport) throw new Error('seed missing');

    const result = await repository.rename(transport.id, 'Taxis');

    expect(result).toEqual(transport);
  });

  it('renames a custom category', async () => {
    const created = await repository.create(input);

    expect(await repository.rename(created.id, 'Gatos')).toMatchObject({ name: 'Gatos' });
  });

  it('RN-36 archiving keeps the category and marks it', async () => {
    const created = await repository.create(input);

    const archived = await repository.archive(created.id);

    expect(archived.archivedAt).not.toBeNull();
    expect(await repository.list()).toContainEqual(archived);
  });

  it('RN-36 deleting removes a custom category', async () => {
    const created = await repository.create(input);

    await repository.delete(created.id);

    expect((await repository.list()).some((c) => c.id === created.id)).toBe(false);
  });

  it('RN-34 never deletes a built-in category', async () => {
    const [first] = await repository.list();
    if (!first) throw new Error('seed missing');

    await repository.delete(first.id);

    expect(await repository.list()).toHaveLength(6);
  });
});

describe('CategoryRepository (sqlite only)', () => {
  let db: AppDatabase;
  let repository: CategoryRepository;

  beforeEach(async () => {
    db = await createTestDatabase();
    repository = createCategoryRepository(db, counter());
  });

  it('RN-35 the database refuses a duplicate name ignoring case', async () => {
    await repository.create(input);

    await expect(repository.create({ ...input, name: 'MASCOTAS' })).rejects.toThrow();
  });

  it('RN-36 a category with no budgets or lines has no history', async () => {
    const created = await repository.create(input);

    expect(await repository.hasHistory(created.id)).toBe(false);
  });

  it('RN-36 a category used by a budget has history', async () => {
    const created = await repository.create(input);
    await db
      .insertInto('budget')
      .values({
        id: 'b1',
        category_id: created.id,
        currency_code: 'COP',
        amount_minor: 1000,
        start_date: '2026-11-01',
        end_date: '2026-11-15',
        status: 'ACTIVE',
        spent_final_minor: null,
        closed_at: null,
        created_at: NOW,
        updated_at: NOW,
        deleted_at: null,
      })
      .execute();

    expect(await repository.hasHistory(created.id)).toBe(true);
  });

  it('RN-36 a category used by a movement line has history', async () => {
    const created = await repository.create(input);
    await db
      .insertInto('movement')
      .values({
        id: 'm1',
        kind: 'EXPENSE',
        currency_code: 'COP',
        total_minor: 500,
        occurred_at: NOW,
        local_date: '2026-11-06',
        payment_method: 'CASH',
        note: null,
        created_at: NOW,
        updated_at: NOW,
        deleted_at: null,
      })
      .execute();
    await db
      .insertInto('movement_line')
      .values({
        id: 'l1',
        movement_id: 'm1',
        category_id: created.id,
        budget_id: null,
        amount_minor: 500,
      })
      .execute();

    expect(await repository.hasHistory(created.id)).toBe(true);
  });
});
