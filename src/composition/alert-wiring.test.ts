import { beforeEach, describe, expect, it } from '@jest/globals';

import type { AppDatabase } from '@/core/db/database.types';
import { SEED_SYSTEM_CATEGORIES } from '@/core/db/seed-data';
import { createTestDatabase } from '@/core/db/testing/create-test-database';
import { initI18n, setAppLanguage } from '@/core/i18n/i18n';
import type { NotificationMessage } from '@/core/notifications/notifier';
import { addDaysToLocalDate, todayLocalDate } from '@/core/shared/dates';
import { createThresholdRepository } from '@/features/alerts/alert.repository';
import type { ThresholdRepository } from '@/features/alerts/alert.repository';
import { createBudgetRepository } from '@/features/budgets/budget.repository';
import type { BudgetRepository } from '@/features/budgets/budget.repository';
import { createCategoryRepository } from '@/features/categories/category.repository';
import {
  createLineReassigner,
  createMovementRepository,
} from '@/features/movements/movement.repository';
import type { MovementRepository } from '@/features/movements/movement.repository';
import { budgetAssignmentRules } from '@/features/movements/movement.rules';
import type { NewMovement } from '@/features/movements/movement.types';

import { createAlertWiring } from './alert-wiring';

// The real repositories on SQLite, the real evaluator, and a fake "system": the example table of
// business-rules.md (Entretenimiento USD 55, thresholds 50% and 90%) played through saving movements.
const FUN = SEED_SYSTEM_CATEGORIES[2]?.id ?? '';
const FOOD = SEED_SYSTEM_CATEGORIES[0]?.id ?? '';
const today = todayLocalDate();
const day = (offset: number) => addDaysToLocalDate(today, offset);

let db: AppDatabase;
let budgets: BudgetRepository;
let movements: MovementRepository;
let thresholds: ThresholdRepository;
let delivered: NotificationMessage[];
let budgetId: string;
let wiring: ReturnType<typeof createAlertWiring>;

function counter(prefix: string) {
  let n = 0;
  return () => `${prefix}-${(n += 1)}`;
}

const expense = (usd: number, categoryId = FUN, date = day(-1)): NewMovement => ({
  kind: 'EXPENSE',
  currency: 'USD',
  totalMinor: usd * 100,
  occurredAt: `${date}T10:00:00-05:00`,
  paymentMethod: 'CASH',
  note: null,
  lines: [{ categoryId, amountMinor: usd * 100 }],
});

const refund = (usd: number): NewMovement => ({ ...expense(usd), kind: 'REFUND' });
const income = (usd: number): NewMovement => ({ ...expense(usd), kind: 'INCOME' });
const bodies = () => delivered.map((message) => message.body);

beforeEach(async () => {
  await initI18n('en');
  await setAppLanguage('en');
  db = await createTestDatabase();
  delivered = [];

  // The repositories and the wiring need each other, so the wiring is plugged in afterwards.
  let onChanged: (ids: readonly string[]) => Promise<void> = () => Promise.resolve();
  const listener = (ids: readonly string[]) => onChanged(ids);
  budgets = createBudgetRepository(
    db,
    counter('b'),
    createLineReassigner(budgetAssignmentRules),
    listener,
  );
  movements = createMovementRepository(db, counter('m'), budgetAssignmentRules, listener);
  thresholds = createThresholdRepository(db, counter('t'));
  wiring = createAlertWiring({
    budgets,
    categories: createCategoryRepository(db, counter('c')),
    thresholds,
    deliver: (message) => {
      delivered.push(message);
      return Promise.resolve();
    },
  });
  onChanged = wiring.onBudgetsChanged;

  const created = await budgets.create({
    categoryId: FUN,
    currency: 'USD',
    amountMinor: 5500,
    startDate: day(-5),
    endDate: day(5),
  });
  budgetId = created.ok ? created.value.id : '';
  await thresholds.replaceConfigurable(budgetId, [50, 90]);
});

describe('the example table, end to end', () => {
  it('USD 30 -> 50%, then +20 (USD 50) -> 90%, then +6 (USD 56) -> 100%, then +14 (USD 70) -> nothing', async () => {
    await movements.create(expense(30));
    expect(bodies()).toHaveLength(1);
    expect(bodies()[0]).toMatch(/50% of your budget \(USD\s30\.00 of USD\s55\.00\)/);

    await movements.create(expense(20));
    expect(bodies()).toHaveLength(2);
    expect(bodies()[1]).toMatch(/90% of your budget \(USD\s50\.00/);

    await movements.create(expense(6));
    expect(bodies()).toHaveLength(3);
    expect(bodies()[2]).toMatch(/You went over your budget \(USD\s56\.00 of USD\s55\.00\)/);

    await movements.create(expense(14)); // RN-29: exceeded, no more alerts
    expect(bodies()).toHaveLength(3);
  });

  it('the alert is addressed to the category budget, in the current language', async () => {
    await movements.create(expense(30));

    expect(delivered[0]?.title).toBe('Budget: Entertainment');

    await setAppLanguage('es');
    await movements.create(expense(20));
    expect(delivered[1]?.title).toBe('Presupuesto: Entretenimiento');
  });

  it('RN-28 one big expense crossing 50% and 90% sends one alert (the 90%)', async () => {
    await movements.create(expense(50));

    expect(delivered).toHaveLength(1);
    expect(bodies()[0]).toMatch(/90%/);
  });
});

describe('RN-26 when it runs', () => {
  it('RN-27 deleting a movement lowers the usage; crossing again notifies again', async () => {
    const big = await movements.create(expense(30));
    expect(delivered).toHaveLength(1);

    await movements.softDelete(big.id); // back to 0%: the 50% record is cleared
    await movements.create(expense(30)); // 54.5% again

    expect(delivered).toHaveLength(2);
  });

  it('RN-27 a refund lowers the usage and clears the thresholds it fell under', async () => {
    await movements.create(expense(30));
    await movements.create(refund(10)); // 20 spent: 36%

    await movements.create(expense(10)); // 30 again: 54.5%

    expect(delivered).toHaveLength(2);
  });

  it('RN-23 an income raises the available amount, so the same spending is a lower percentage', async () => {
    await movements.create(income(55)); // available 110
    await movements.create(expense(30)); // 27%: no alert

    expect(delivered).toEqual([]);
  });

  it('RN-26 editing a movement re-evaluates the budgets it left and the ones it joined', async () => {
    const saved = await movements.create(expense(30));
    expect(delivered).toHaveLength(1);

    await movements.update(saved.id, expense(10)); // 18%: cleared, no alert
    expect(delivered).toHaveLength(1);

    await movements.update(saved.id, expense(30)); // 54.5% again
    expect(delivered).toHaveLength(2);
  });

  it('RN-26 editing the budget amount re-evaluates it (a smaller amount makes the same spending bigger)', async () => {
    await movements.create(expense(20)); // 36%: nothing
    expect(delivered).toEqual([]);

    await budgets.update(budgetId, { amountMinor: 3500 }); // 20 of 35 = 57%

    expect(delivered).toHaveLength(1);
    expect(bodies()[0]).toMatch(/50%/);
  });

  it('RN-26 / RN-39 creating a budget that takes existing lines evaluates it', async () => {
    await movements.create(expense(30, FOOD)); // no Food budget yet: nothing counts
    expect(delivered).toEqual([]);

    const food = await budgets.create({
      categoryId: FOOD,
      currency: 'USD',
      amountMinor: 5000,
      startDate: day(-5),
      endDate: day(5),
    });
    expect(food.ok).toBe(true);

    // 30 of 50 = 60%: the new budget's own automatic thresholds exist, but no 50% was set.
    expect(delivered).toEqual([]);
    expect((await thresholds.list(food.ok ? food.value.id : '')).map((t) => t.percentage)).toEqual([
      100,
    ]);
  });

  it('RN-25 a budget created now already has its automatic 100%', async () => {
    const other = await budgets.create({
      categoryId: FOOD,
      currency: 'USD',
      amountMinor: 1000,
      startDate: day(-5),
      endDate: day(5),
    });

    await movements.create(expense(10, FOOD));

    expect(other.ok).toBe(true);
    expect(delivered).toHaveLength(1);
    expect(bodies()[0]).toMatch(/whole budget/);
  });

  it('RN-30 a budget in its grace period still notifies', async () => {
    const grace = await budgets.create({
      categoryId: FOOD,
      currency: 'USD',
      amountMinor: 1000,
      startDate: day(-12),
      endDate: day(-2),
    });
    expect(grace.ok).toBe(true);

    await movements.create(expense(10, FOOD, day(-3)));

    expect(delivered).toHaveLength(1);
  });

  it('RN-30 a closed budget does not notify, and its lines are frozen', async () => {
    const old = await budgets.create({
      categoryId: FOOD,
      currency: 'USD',
      amountMinor: 1000,
      startDate: day(-40),
      endDate: day(-30),
    });
    await budgets.close(old.ok ? old.value.id : '', 0);

    await movements.create(expense(10, FOOD, day(-35))); // falls in a closed budget: RN-18

    expect(delivered).toEqual([]);
  });

  it('RN-30 a deleted budget does not notify', async () => {
    await budgets.softDelete(budgetId);

    await movements.create(expense(60));

    expect(delivered).toEqual([]);
  });

  it('a failing listener never breaks saving the movement', async () => {
    const broken = createMovementRepository(db, counter('x'), budgetAssignmentRules, () =>
      Promise.reject(new Error('boom')),
    );

    const saved = await broken.create(expense(30));

    expect(saved.totalMinor).toBe(3000);
    expect(await movements.get(saved.id)).not.toBeNull();
  });
});

describe('editing the thresholds', () => {
  it('a threshold added below the current usage is recorded without notifying', async () => {
    await movements.create(expense(30)); // 54.5%: the 50% alert is sent
    delivered.length = 0;

    await thresholds.replaceConfigurable(budgetId, [30, 50, 90]);
    await wiring.syncAfterThresholdEdit(budgetId);

    expect(delivered).toEqual([]); // the new 30% is already crossed: no surprise alert

    await movements.create(expense(1)); // still nothing new
    expect(delivered).toEqual([]);
  });

  it('a threshold added above the usage still notifies when it is reached', async () => {
    await thresholds.replaceConfigurable(budgetId, [50, 70, 90]);
    await wiring.syncAfterThresholdEdit(budgetId);

    await movements.create(expense(40)); // 72.7%: crosses 50 and 70

    expect(delivered).toHaveLength(1);
    expect(bodies()[0]).toMatch(/70%/);
  });
});
