import { beforeEach, describe, expect, it } from '@jest/globals';

import { createTestDatabase } from '@/core/db/testing/create-test-database';
import type { AppDatabase } from '@/core/db/database.types';

import { createInMemoryProfileRepository, createProfileRepository } from './profile.repository';
import type { ProfileRepository } from './profile.repository';
import type { Profile } from './profile.types';

const ana: Profile = { fullName: 'Ana Pérez', email: 'ana@example.com', countryCode: 'CO' };

const implementations: [string, () => Promise<ProfileRepository>][] = [
  ['sqlite', async () => createProfileRepository(await createTestDatabase())],
  ['in-memory', () => Promise.resolve(createInMemoryProfileRepository())],
];

describe.each(implementations)('ProfileRepository (%s)', (_name, create) => {
  let repository: ProfileRepository;

  beforeEach(async () => {
    repository = await create();
  });

  it('RN-42 has no profile before the user registers', async () => {
    expect(await repository.get()).toBeNull();
  });

  it('RN-42 stores the profile', async () => {
    expect(await repository.create(ana)).toEqual(ana);
    expect(await repository.get()).toEqual(ana);
  });

  it('RN-47 update changes only the given fields', async () => {
    await repository.create(ana);

    expect(await repository.update({ countryCode: 'US' })).toEqual({ ...ana, countryCode: 'US' });
    expect(await repository.update({ fullName: 'Ana M.' })).toEqual({
      ...ana,
      countryCode: 'US',
      fullName: 'Ana M.',
    });
  });

  it('RN-46 eraseAllData removes the profile', async () => {
    await repository.create(ana);
    await repository.eraseAllData();

    expect(await repository.get()).toBeNull();
  });
});

describe('RN-46 eraseAllData in SQLite', () => {
  let db: AppDatabase;

  beforeEach(async () => {
    db = await createTestDatabase();
  });

  it('RN-46 deletes budgets, movements and custom categories but keeps the built-in data', async () => {
    const now = '2026-11-06T10:00:00-05:00';
    const food = (
      await db
        .selectFrom('category')
        .select('id')
        .where('code', '=', 'ALIMENTACION')
        .executeTakeFirstOrThrow()
    ).id;
    await db
      .insertInto('settings')
      .values({ id: 1, language: 'en', theme: 'DARK', updated_at: now })
      .execute();
    await db
      .insertInto('category')
      .values({
        id: 'c1',
        code: null,
        name: 'Pets',
        icon: 'paw',
        color: '#000',
        is_system: 0,
        archived_at: null,
        created_at: now,
        updated_at: now,
      })
      .execute();
    await db
      .insertInto('budget')
      .values({
        id: 'b1',
        category_id: food,
        currency_code: 'COP',
        amount_minor: 1000,
        start_date: '2026-11-01',
        end_date: '2026-11-15',
        status: 'ACTIVE',
        spent_final_minor: null,
        closed_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
      .execute();
    await db
      .insertInto('budget_threshold')
      .values({ id: 't1', budget_id: 'b1', percentage: 100, is_automatic: 1 })
      .execute();
    await db
      .insertInto('alert_sent')
      .values({ id: 'a1', threshold_id: 't1', sent_at: now })
      .execute();
    await db
      .insertInto('movement')
      .values({
        id: 'm1',
        kind: 'EXPENSE',
        currency_code: 'COP',
        total_minor: 500,
        occurred_at: now,
        local_date: '2026-11-06',
        payment_method: 'CASH',
        note: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
      .execute();
    await db
      .insertInto('movement_line')
      .values({
        id: 'l1',
        movement_id: 'm1',
        category_id: food,
        budget_id: 'b1',
        amount_minor: 500,
      })
      .execute();
    const repository = createProfileRepository(db);
    await repository.create(ana);

    await repository.eraseAllData();

    const count = async (
      table:
        | 'budget'
        | 'movement'
        | 'movement_line'
        | 'alert_sent'
        | 'budget_threshold'
        | 'user_profile',
    ) =>
      Number(
        (await db.selectFrom(table).select(db.fn.countAll().as('n')).executeTakeFirstOrThrow()).n,
      );
    expect(
      await Promise.all([
        count('budget'),
        count('movement'),
        count('movement_line'),
        count('alert_sent'),
        count('budget_threshold'),
        count('user_profile'),
      ]),
    ).toEqual([0, 0, 0, 0, 0, 0]);
    expect(
      await db.selectFrom('category').select('code').where('is_system', '=', 0).execute(),
    ).toEqual([]);
    expect(await db.selectFrom('category').selectAll().execute()).toHaveLength(6);
    expect(await db.selectFrom('currency').selectAll().execute()).toHaveLength(3);
    expect(await db.selectFrom('settings').selectAll().execute()).toHaveLength(1);
  });
});
