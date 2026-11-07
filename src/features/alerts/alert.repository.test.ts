import { beforeEach, describe, expect, it } from '@jest/globals';

import type { AppDatabase } from '@/core/db/database.types';
import { SEED_SYSTEM_CATEGORIES } from '@/core/db/seed-data';
import { createTestDatabase } from '@/core/db/testing/create-test-database';

import { createInMemoryThresholdRepository, createThresholdRepository } from './alert.repository';
import type { ThresholdRepository } from './alert.repository';

const NOW = '2026-11-06T10:00:00-05:00';

function counter() {
  let n = 0;
  return () => `id-${(n += 1)}`;
}

async function insertBudget(db: AppDatabase, id: string, categoryIndex: number) {
  await db
    .insertInto('budget')
    .values({
      id,
      category_id: SEED_SYSTEM_CATEGORIES[categoryIndex]?.id ?? '',
      currency_code: 'USD',
      amount_minor: 5500,
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
}

// The same behavior must hold for the SQLite repository and the in-memory one.
const implementations: [string, () => Promise<ThresholdRepository>][] = [
  [
    'sqlite',
    async () => {
      const db = await createTestDatabase();
      await insertBudget(db, 'b1', 0);
      await insertBudget(db, 'b2', 1);
      return createThresholdRepository(db, counter());
    },
  ],
  ['in-memory', () => Promise.resolve(createInMemoryThresholdRepository(counter()))],
];

describe.each(implementations)('ThresholdRepository (%s)', (_name, create) => {
  let repository: ThresholdRepository;

  beforeEach(async () => {
    repository = await create();
  });

  it('a budget starts with no thresholds', async () => {
    expect(await repository.list('b1')).toEqual([]);
  });

  it('RN-25 creates the automatic 100% once, however many times it is asked', async () => {
    await repository.ensureAutomatic('b1');
    await repository.ensureAutomatic('b1');

    const thresholds = await repository.list('b1');
    expect(thresholds).toHaveLength(1);
    expect(thresholds[0]).toMatchObject({ budgetId: 'b1', percentage: 100, isAutomatic: true });
  });

  it('RN-24 saves the thresholds the user chose, lowest first, with the automatic 100% last', async () => {
    await repository.ensureAutomatic('b1');
    const added = await repository.replaceConfigurable('b1', [90, 50]);

    expect(added.map((threshold) => threshold.percentage).sort()).toEqual([50, 90]);
    expect((await repository.list('b1')).map((t) => [t.percentage, t.isAutomatic])).toEqual([
      [50, false],
      [90, false],
      [100, true],
    ]);
  });

  it('RN-24 replacing keeps the thresholds that stay, adds new ones and removes the rest', async () => {
    await repository.replaceConfigurable('b1', [50, 90]);
    const [kept] = (await repository.list('b1')).filter((t) => t.percentage === 50);

    const added = await repository.replaceConfigurable('b1', [50, 75]);

    expect(added.map((t) => t.percentage)).toEqual([75]);
    const after = await repository.list('b1');
    expect(after.map((t) => t.percentage)).toEqual([50, 75]);
    expect(after[0]?.id).toBe(kept?.id); // same id: its sent record is not lost
  });

  it('RN-25 replacing the thresholds never touches the automatic 100%', async () => {
    await repository.ensureAutomatic('b1');
    await repository.replaceConfigurable('b1', [50]);
    await repository.replaceConfigurable('b1', []);

    expect((await repository.list('b1')).map((t) => t.percentage)).toEqual([100]);
  });

  it('thresholds belong to their own budget', async () => {
    await repository.replaceConfigurable('b1', [50]);
    await repository.replaceConfigurable('b2', [70]);

    expect((await repository.list('b1')).map((t) => t.percentage)).toEqual([50]);
    expect((await repository.list('b2')).map((t) => t.percentage)).toEqual([70]);
  });

  it('RN-27 records a threshold as sent once, and clears it so it can notify again', async () => {
    await repository.replaceConfigurable('b1', [50, 90]);
    const [t50, t90] = await repository.list('b1');
    const ids = [t50?.id ?? '', t90?.id ?? ''];

    await repository.recordSent(ids, NOW);
    await repository.recordSent(ids, NOW); // twice: still once each
    expect([...(await repository.listSentIds('b1'))].sort()).toEqual([...ids].sort());

    await repository.clearSent([ids[0] ?? '']);
    expect([...(await repository.listSentIds('b1'))]).toEqual([ids[1]]);
  });

  it('RN-27 sent records are listed per budget', async () => {
    await repository.replaceConfigurable('b1', [50]);
    await repository.replaceConfigurable('b2', [50]);
    const [first] = await repository.list('b1');
    await repository.recordSent([first?.id ?? ''], NOW);

    expect((await repository.listSentIds('b1')).size).toBe(1);
    expect((await repository.listSentIds('b2')).size).toBe(0);
  });

  it('RN-27 removing a threshold drops its sent record', async () => {
    await repository.replaceConfigurable('b1', [50]);
    const [first] = await repository.list('b1');
    await repository.recordSent([first?.id ?? ''], NOW);

    await repository.replaceConfigurable('b1', []);

    expect((await repository.listSentIds('b1')).size).toBe(0);
  });

  it('clearing nothing does nothing', async () => {
    await repository.clearSent([]);

    expect((await repository.listSentIds('b1')).size).toBe(0);
  });
});

describe('ThresholdRepository database guards (sqlite)', () => {
  it('RN-24 the database refuses a percentage outside 1 to 100 and a repeated one', async () => {
    const db = await createTestDatabase();
    await insertBudget(db, 'b1', 0);
    const insert = (id: string, percentage: number) =>
      db
        .insertInto('budget_threshold')
        .values({ id, budget_id: 'b1', percentage, is_automatic: 0 })
        .execute();

    await expect(insert('t0', 0)).rejects.toThrow();
    await expect(insert('t101', 101)).rejects.toThrow();
    await insert('t50', 50);
    await expect(insert('t50b', 50)).rejects.toThrow();
  });
});
