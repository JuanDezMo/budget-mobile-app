import { beforeEach, describe, expect, it } from '@jest/globals';

import type { AppDatabase } from '@/core/db/database.types';
import { noReassign } from '@/core/db/line-reassigner';
import { SEED_SYSTEM_CATEGORIES } from '@/core/db/seed-data';
import { createTestDatabase } from '@/core/db/testing/create-test-database';
import { addDaysToLocalDate, todayLocalDate } from '@/core/shared/dates';
import { err } from '@/core/shared/result';

import { createBudgetRepository } from '../budgets/budget.repository';
import type { BudgetRepository } from '../budgets/budget.repository';
import type { NewBudget } from '../budgets/budget.types';
import { budgetAssignmentRules } from './movement.rules';
import { createLineReassigner, createMovementRepository } from './movement.repository';
import type { MovementRepository } from './movement.repository';
import type { NewMovement } from './movement.types';

const FOOD = SEED_SYSTEM_CATEGORIES[0]?.id ?? '';
const FUN = SEED_SYSTEM_CATEGORIES[2]?.id ?? '';
const HOME = SEED_SYSTEM_CATEGORIES[4]?.id ?? '';
const today = todayLocalDate();
const day = (offset: number) => addDaysToLocalDate(today, offset);
const at = (date: string) => `${date}T10:00:00-05:00`;

function counter(prefix: string) {
  let n = 0;
  return () => `${prefix}-${(n += 1)}`;
}

// USD 100 split 50 / 20 / 30, like the example in the rules.
function market(date: string, overrides: Partial<NewMovement> = {}): NewMovement {
  return {
    kind: 'EXPENSE',
    currency: 'USD',
    totalMinor: 10000,
    occurredAt: at(date),
    paymentMethod: 'DEBIT_CARD',
    note: null,
    lines: [
      { categoryId: FOOD, amountMinor: 5000 },
      { categoryId: FUN, amountMinor: 2000 },
      { categoryId: HOME, amountMinor: 3000 },
    ],
    ...overrides,
  };
}

function budgetFor(categoryId: string, startOffset: number, endOffset: number): NewBudget {
  return {
    categoryId,
    currency: 'USD',
    amountMinor: 5500,
    startDate: day(startOffset),
    endDate: day(endOffset),
  };
}

let db: AppDatabase;
let movements: MovementRepository;
let budgets: BudgetRepository;

beforeEach(async () => {
  db = await createTestDatabase();
  movements = createMovementRepository(db, counter('m'), budgetAssignmentRules);
  budgets = createBudgetRepository(db, counter('b'), createLineReassigner(budgetAssignmentRules));
});

const budgetIdsOf = async (movementId: string) =>
  (await movements.get(movementId))?.lines.map((line) => line.budgetId);

describe('saving movements', () => {
  it('RN-13 / RN-14 saves the header and its three lines together', async () => {
    const saved = await movements.create(market(day(-1), { note: 'Weekly shopping' }));

    expect(saved).toMatchObject({
      kind: 'EXPENSE',
      currency: 'USD',
      totalMinor: 10000,
      paymentMethod: 'DEBIT_CARD',
      note: 'Weekly shopping',
      deletedAt: null,
    });
    expect(saved.lines.map((line) => [line.categoryId, line.amountMinor])).toEqual([
      [FOOD, 5000],
      [FUN, 2000],
      [HOME, 3000],
    ]);
  });

  it('RN-15 stores the local date and time with offset, and the local day apart', async () => {
    const saved = await movements.create(
      market(day(-1), { occurredAt: `${day(-1)}T23:10:00-05:00` }),
    );

    expect(saved.occurredAt).toBe(`${day(-1)}T23:10:00-05:00`);
    expect(saved.localDate).toBe(day(-1)); // not the next day in UTC
  });

  it('RN-41 lines with no budget are kept without one', async () => {
    const saved = await movements.create(market(day(-1)));

    expect(saved.lines.map((line) => line.budgetId)).toEqual([null, null, null]);
  });

  it('RN-17 each line counts for the budget of its own category, assigned by the app', async () => {
    const food = await budgets.create(budgetFor(FOOD, -5, 5));
    const fun = await budgets.create(budgetFor(FUN, -5, 5));

    const saved = await movements.create(market(day(-1)));

    expect(saved.lines.map((line) => line.budgetId)).toEqual([
      food.ok ? food.value.id : 'x',
      fun.ok ? fun.value.id : 'x',
      null, // HOME has no budget: RN-41
    ]);
  });

  it('RN-17 only a budget in the same currency counts', async () => {
    await budgets.create({ ...budgetFor(FOOD, -5, 5), currency: 'COP' });

    const saved = await movements.create(market(day(-1)));

    expect(saved.lines[0]?.budgetId).toBeNull();
  });

  it('RN-18 a day inside a closed budget is saved but does not count for it', async () => {
    const created = await budgets.create(budgetFor(FOOD, -30, -20));
    await budgets.close(created.ok ? created.value.id : '', 0);

    const saved = await movements.create(market(day(-25)));

    expect(saved.lines.map((line) => line.budgetId)).toEqual([null, null, null]);
  });

  it('RN-17 a budget in its grace period still receives lines', async () => {
    const created = await budgets.create(budgetFor(FOOD, -12, -2)); // ended 2 days ago

    const saved = await movements.create(market(day(-3)));

    expect(saved.lines[0]?.budgetId).toBe(created.ok ? created.value.id : 'x');
  });

  it('RN-14 a database failure saves nothing (all or nothing)', async () => {
    const badLines = market(day(-1), {
      lines: [
        { categoryId: FOOD, amountMinor: 5000 },
        { categoryId: 'missing', amountMinor: 5000 },
      ],
    });

    await expect(movements.create(badLines)).rejects.toThrow();

    expect(await movements.list()).toEqual([]);
    expect((await db.selectFrom('movement_line').selectAll().execute()).length).toBe(0);
  });
});

describe('listing, editing and deleting', () => {
  it('lists newest first and filters by kind and currency', async () => {
    await movements.create(market(day(-3)));
    await movements.create(market(day(-1), { kind: 'INCOME' }));
    await movements.create(market(day(-2), { currency: 'COP' }));

    expect((await movements.list()).map((m) => m.localDate)).toEqual([day(-1), day(-2), day(-3)]);
    expect(await movements.list({ kind: 'INCOME' })).toHaveLength(1);
    expect(await movements.list({ currency: 'COP' })).toHaveLength(1);
  });

  it('RN-39 (1) editing the date moves the lines to the budget of the new day', async () => {
    const early = await budgets.create(budgetFor(FOOD, -12, -3)); // ended 3 days ago: in grace
    const late = await budgets.create(budgetFor(FOOD, -2, 5));
    const saved = await movements.create(market(day(-8)));
    expect(saved.lines[0]?.budgetId).toBe(early.ok ? early.value.id : 'x');

    const edited = await movements.update(saved.id, market(day(-2)));

    expect(edited.lines[0]?.budgetId).toBe(late.ok ? late.value.id : 'x');
  });

  it('RN-39 (1) editing the category or the currency reassigns the line', async () => {
    const food = await budgets.create(budgetFor(FOOD, -5, 5));
    const saved = await movements.create(market(day(-1)));
    expect(saved.lines[0]?.budgetId).toBe(food.ok ? food.value.id : 'x');

    const otherCategory = await movements.update(
      saved.id,
      market(day(-1), { lines: [{ categoryId: HOME, amountMinor: 10000 }] }),
    );
    expect(otherCategory.lines[0]?.budgetId).toBeNull();

    const otherCurrency = await movements.update(saved.id, market(day(-1), { currency: 'EUR' }));
    expect(otherCurrency.lines[0]?.budgetId).toBeNull();
  });

  it('RN-21 deleting a movement hides it from the list but keeps it', async () => {
    const saved = await movements.create(market(day(-1)));

    await movements.softDelete(saved.id);

    expect(await movements.list()).toEqual([]);
    expect((await movements.get(saved.id))?.deletedAt).not.toBeNull();
  });
});

describe('RN-39 reassignment when budgets change (same transaction)', () => {
  it('RN-39 (2) creating a budget that covers existing lines assigns them', async () => {
    const saved = await movements.create(market(day(-3)));
    expect(await budgetIdsOf(saved.id)).toEqual([null, null, null]);

    const created = await budgets.create(budgetFor(FUN, -10, 5));

    expect(await budgetIdsOf(saved.id)).toEqual([null, created.ok ? created.value.id : 'x', null]);
  });

  it('RN-39 (2) a new budget does not take lines outside its dates, category or currency', async () => {
    const before = await movements.create(market(day(-20)));
    const euros = await movements.create(market(day(-3), { currency: 'EUR' }));

    await budgets.create(budgetFor(FUN, -10, 5));

    expect(await budgetIdsOf(before.id)).toEqual([null, null, null]);
    expect(await budgetIdsOf(euros.id)).toEqual([null, null, null]);
  });

  it('RN-39 (3) shortening a budget frees the lines left outside, extending it takes new ones', async () => {
    const created = await budgets.create(budgetFor(FUN, -10, 5));
    const id = created.ok ? created.value.id : 'x';
    const old = await movements.create(market(day(-8)));
    const recent = await movements.create(market(day(-1)));
    expect((await budgetIdsOf(old.id))?.[1]).toBe(id);

    await budgets.update(id, { startDate: day(-4) });
    expect((await budgetIdsOf(old.id))?.[1]).toBeNull();
    expect((await budgetIdsOf(recent.id))?.[1]).toBe(id);

    await budgets.update(id, { startDate: day(-10) });
    expect((await budgetIdsOf(old.id))?.[1]).toBe(id);
  });

  it('RN-39 (3) a line can move to the neighbouring budget when dates change', async () => {
    const first = await budgets.create(budgetFor(FUN, -12, -4)); // in grace
    const second = await budgets.create(budgetFor(FUN, -3, 5));
    const saved = await movements.create(market(day(-4)));
    expect((await budgetIdsOf(saved.id))?.[1]).toBe(first.ok ? first.value.id : 'x');

    await budgets.update(first.ok ? first.value.id : '', { endDate: day(-5) });
    await budgets.update(second.ok ? second.value.id : '', { startDate: day(-4) });

    expect((await budgetIdsOf(saved.id))?.[1]).toBe(second.ok ? second.value.id : 'x');
  });

  it('RN-39 (4) / RN-10 deleting a budget leaves its lines without budget but keeps the movements', async () => {
    const created = await budgets.create(budgetFor(FUN, -10, 5));
    const saved = await movements.create(market(day(-3)));
    expect((await budgetIdsOf(saved.id))?.[1]).toBe(created.ok ? created.value.id : 'x');

    await budgets.softDelete(created.ok ? created.value.id : '');

    expect(await budgetIdsOf(saved.id)).toEqual([null, null, null]);
    expect(await movements.list()).toHaveLength(1);
  });

  it('RN-08 lines counting in a closed budget stay put when something else is reassigned', async () => {
    const created = await budgets.create(budgetFor(FUN, -10, -1));
    const id = created.ok ? created.value.id : 'x';
    const saved = await movements.create(market(day(-3)));
    await budgets.close(id, 2000);

    await createLineReassigner(budgetAssignmentRules)(db, { categoryId: FUN, today });

    expect((await budgetIdsOf(saved.id))?.[1]).toBe(id);
  });

  it('RN-39 ignores deleted movements', async () => {
    const saved = await movements.create(market(day(-3)));
    await movements.softDelete(saved.id);

    await budgets.create(budgetFor(FUN, -10, 5));

    expect(await budgetIdsOf(saved.id)).toEqual([null, null, null]);
  });

  it('RN-39 reports which budgets had lines move, so their thresholds can be re-evaluated', async () => {
    await movements.create(market(day(-3)));
    const created = await budgets.create(budgetFor(FUN, -10, 5));

    const affected = await createLineReassigner(budgetAssignmentRules)(db, {
      categoryId: FUN,
      today,
    });
    expect(affected).toEqual([]); // already in place: nothing moved

    await budgets.softDelete(created.ok ? created.value.id : '');
    const lines = await db.selectFrom('movement_line').select('budget_id').execute();
    expect(lines.every((line) => line.budget_id === null)).toBe(true);
  });
});

describe('RN-39 is atomic with the budget write', () => {
  it('a budget that overlaps another is refused and no line changes', async () => {
    await budgets.create(budgetFor(FUN, -10, 5));
    const saved = await movements.create(market(day(-3)));
    const before = await budgetIdsOf(saved.id);

    const clash = await budgets.create(budgetFor(FUN, -5, 20));

    expect(clash).toEqual(err('BUDGET_OVERLAP'));
    expect(await budgetIdsOf(saved.id)).toEqual(before);
    expect(await budgets.list()).toHaveLength(1);
  });

  it('if reassigning fails, the budget is not created either', async () => {
    const failing = createBudgetRepository(db, counter('f'), () =>
      Promise.reject(new Error('disk full')),
    );

    await expect(failing.create(budgetFor(FUN, -10, 5))).rejects.toThrow('disk full');

    expect(await budgets.list()).toEqual([]);
  });

  it('without a reassigner, budgets still work (noReassign)', async () => {
    const plain = createBudgetRepository(db, counter('p'), noReassign);

    expect((await plain.create(budgetFor(HOME, -1, 1))).ok).toBe(true);
  });
});

describe('history pages', () => {
  // 45 expenses of USD 1.00 on different days, plus one COP income.
  async function seed() {
    for (let i = 0; i < 45; i += 1) {
      await movements.create(
        market(day(-(i + 1)), { totalMinor: 100, lines: [{ categoryId: FOOD, amountMinor: 100 }] }),
      );
    }
    await movements.create(
      market(day(-1), {
        kind: 'INCOME',
        currency: 'COP',
        totalMinor: 5000,
        lines: [{ categoryId: FOOD, amountMinor: 5000 }],
      }),
    );
  }

  it('returns one page at a time, newest first, with no repeats and no gaps', async () => {
    await seed();

    const first = await movements.list({}, { limit: 20, offset: 0 });
    const second = await movements.list({}, { limit: 20, offset: 20 });
    const third = await movements.list({}, { limit: 20, offset: 40 });
    const fourth = await movements.list({}, { limit: 20, offset: 60 });

    expect([first.length, second.length, third.length, fourth.length]).toEqual([20, 20, 6, 0]);
    const all = await movements.list();
    expect([...first, ...second, ...third].map((m) => m.id)).toEqual(all.map((m) => m.id));
  });

  it('a page never cuts a movement in half: all its lines come with it', async () => {
    await movements.create(market(day(-1))); // 3 lines
    await movements.create(market(day(-2)));
    await movements.create(market(day(-3)));

    const page = await movements.list({}, { limit: 2, offset: 0 });

    expect(page).toHaveLength(2);
    expect(page.every((movement) => movement.lines.length === 3)).toBe(true);
  });

  it('pages respect the filters', async () => {
    await seed();

    const page = await movements.list({ currency: 'USD' }, { limit: 20, offset: 40 });

    expect(page).toHaveLength(5);
    expect(page.every((movement) => movement.currency === 'USD')).toBe(true);
  });

  it('RN-33 totals cover the whole history, not only the loaded page', async () => {
    await seed();

    expect(await movements.summarize()).toEqual([
      { currency: 'COP', expense: 0, refund: 0, income: 5000 },
      { currency: 'USD', expense: 4500, refund: 0, income: 0 },
    ]);
    expect(await movements.summarize({ currency: 'USD' })).toEqual([
      { currency: 'USD', expense: 4500, refund: 0, income: 0 },
    ]);
  });

  it('RN-21 totals leave out deleted movements', async () => {
    const saved = await movements.create(
      market(day(-1), { totalMinor: 700, lines: [{ categoryId: FOOD, amountMinor: 700 }] }),
    );
    await movements.softDelete(saved.id);

    expect(await movements.summarize()).toEqual([]);
  });
});
