import { describe, expect, it } from '@jest/globals';

import { err, ok } from '@/core/shared/result';

import type { Category } from '../categories/category.types';
import {
  checkMovementEditable,
  describeIncomeImpact,
  describeLineAssignment,
  maxAmountMinor,
  pickBudgetIdForLine,
  remainingMinor,
  summarizeByCurrency,
  validateMovement,
} from './movement.rules';
import type { AssignableBudget, Movement, NewMovement } from './movement.types';

const NOW = new Date('2026-11-06T23:30:00-05:00');
const category = (id: string): Category => ({
  id,
  isSystem: true,
  code: 'ALIMENTACION',
  icon: 'utensils',
  color: '#D9452A',
  archivedAt: null,
});
const archived: Category = { ...category('old'), archivedAt: '2026-10-01T00:00:00Z' };
const categories = [category('food'), category('fun'), category('home'), archived];

const market: NewMovement = {
  kind: 'EXPENSE',
  currency: 'USD',
  totalMinor: 10000,
  occurredAt: '2026-11-06T23:10:00-05:00',
  paymentMethod: 'DEBIT_CARD',
  note: null,
  lines: [
    { categoryId: 'food', amountMinor: 5000 },
    { categoryId: 'fun', amountMinor: 2000 },
    { categoryId: 'home', amountMinor: 3000 },
  ],
};

describe('movement validation', () => {
  it('RN-14 accepts USD 100 split 50 + 20 + 30 across three categories', () => {
    expect(validateMovement(market, NOW, categories)).toEqual(ok(market));
  });

  it('RN-12 accepts the three kinds and rejects anything else', () => {
    for (const kind of ['EXPENSE', 'REFUND', 'INCOME'] as const) {
      expect(validateMovement({ ...market, kind }, NOW, categories).ok).toBe(true);
    }
    const unknown = { ...market, kind: 'GIFT' } as unknown as NewMovement;
    expect(validateMovement(unknown, NOW, categories)).toEqual(err('MOVEMENT_KIND_INVALID'));
  });

  it('RN-19 requires a known payment method', () => {
    const none = { ...market, paymentMethod: '' } as unknown as NewMovement;
    expect(validateMovement(none, NOW, categories)).toEqual(err('PAYMENT_METHOD_REQUIRED'));
  });

  it('RN-14 needs at least one line', () => {
    expect(validateMovement({ ...market, lines: [] }, NOW, categories)).toEqual(
      err('MOVEMENT_NO_LINES'),
    );
  });

  it('RN-14 the lines must add up to the total, not more and not less', () => {
    const less = { ...market, lines: [{ categoryId: 'food', amountMinor: 9999 }] };
    const more = { ...market, lines: [{ categoryId: 'food', amountMinor: 10001 }] };

    expect(validateMovement(less, NOW, categories)).toEqual(err('MOVEMENT_TOTAL_MISMATCH'));
    expect(validateMovement(more, NOW, categories)).toEqual(err('MOVEMENT_TOTAL_MISMATCH'));
  });

  it('RN-14 the total and every line must be greater than 0', () => {
    expect(validateMovement({ ...market, totalMinor: 0, lines: [] }, NOW, categories).ok).toBe(
      false,
    );
    const zeroLine = {
      ...market,
      lines: [
        { categoryId: 'food', amountMinor: 0 },
        { categoryId: 'fun', amountMinor: 10000 },
      ],
    };
    expect(validateMovement(zeroLine, NOW, categories)).toEqual(
      err('MOVEMENT_LINE_AMOUNT_INVALID'),
    );
    expect(validateMovement({ ...market, totalMinor: 10.5 }, NOW, categories)).toEqual(
      err('MOVEMENT_TOTAL_INVALID'),
    );
  });

  it('RN-20 allows up to 12 integer digits and rejects more', () => {
    expect(maxAmountMinor('COP')).toBe(999_999_999_999);
    expect(maxAmountMinor('USD')).toBe(99_999_999_999_999);

    const biggest = {
      ...market,
      currency: 'COP' as const,
      totalMinor: 999_999_999_999,
      lines: [{ categoryId: 'food', amountMinor: 999_999_999_999 }],
    };
    const tooBig = {
      ...biggest,
      totalMinor: 1_000_000_000_000,
      lines: [{ categoryId: 'food', amountMinor: 1_000_000_000_000 }],
    };
    expect(validateMovement(biggest, NOW, categories).ok).toBe(true);
    expect(validateMovement(tooBig, NOW, categories)).toEqual(err('AMOUNT_TOO_LARGE'));
  });

  it('RN-16 rejects a date and time after now, accepts the same instant', () => {
    expect(
      validateMovement({ ...market, occurredAt: '2026-11-06T23:31:00-05:00' }, NOW, categories),
    ).toEqual(err('MOVEMENT_FUTURE_DATE'));
    expect(
      validateMovement({ ...market, occurredAt: '2026-11-07T00:00:00-05:00' }, NOW, categories),
    ).toEqual(err('MOVEMENT_FUTURE_DATE'));
    expect(
      validateMovement({ ...market, occurredAt: '2026-11-06T23:30:00-05:00' }, NOW, categories).ok,
    ).toBe(true);
  });

  it('RN-15 rejects a date that is not local date and time with offset', () => {
    expect(validateMovement({ ...market, occurredAt: '2026-11-06' }, NOW, categories)).toEqual(
      err('MOVEMENT_DATE_INVALID'),
    );
  });

  it('RN-36 rejects a line in an archived category and in an unknown one', () => {
    const inArchived = { ...market, lines: [{ categoryId: 'old', amountMinor: 10000 }] };
    const inUnknown = { ...market, lines: [{ categoryId: 'nope', amountMinor: 10000 }] };

    expect(validateMovement(inArchived, NOW, categories)).toEqual(err('CATEGORY_ARCHIVED'));
    expect(validateMovement(inUnknown, NOW, categories)).toEqual(
      err('MOVEMENT_LINE_CATEGORY_INVALID'),
    );
  });

  it('computes what is left to share out', () => {
    expect(remainingMinor(10000, [5000, 2000])).toBe(3000);
    expect(remainingMinor(10000, [])).toBe(10000);
    expect(remainingMinor(10000, [6000, 5000])).toBe(-1000);
  });
});

const budget = (overrides: Partial<AssignableBudget> = {}): AssignableBudget => ({
  id: 'b1',
  categoryId: 'fun',
  currency: 'USD',
  startDate: '2026-11-01',
  endDate: '2026-11-15',
  status: 'ACTIVE',
  deletedAt: null,
  ...overrides,
});
const line = { categoryId: 'fun', currency: 'USD' as const, localDate: '2026-11-06' };
const TODAY = '2026-11-06';

describe('RN-17 budget assignment', () => {
  it('RN-17 picks the budget with the same category and currency whose dates cover the day', () => {
    expect(pickBudgetIdForLine(line, [budget()], TODAY)).toBe('b1');
  });

  it('RN-17 includes both ends of the budget dates', () => {
    expect(pickBudgetIdForLine({ ...line, localDate: '2026-11-01' }, [budget()], TODAY)).toBe('b1');
    expect(pickBudgetIdForLine({ ...line, localDate: '2026-11-15' }, [budget()], TODAY)).toBe('b1');
    expect(pickBudgetIdForLine({ ...line, localDate: '2026-11-16' }, [budget()], TODAY)).toBeNull();
    expect(pickBudgetIdForLine({ ...line, localDate: '2026-10-31' }, [budget()], TODAY)).toBeNull();
  });

  it('RN-17 ignores other categories, other currencies and deleted budgets', () => {
    expect(pickBudgetIdForLine({ ...line, categoryId: 'food' }, [budget()], TODAY)).toBeNull();
    expect(pickBudgetIdForLine({ ...line, currency: 'EUR' }, [budget()], TODAY)).toBeNull();
    expect(
      pickBudgetIdForLine(line, [budget({ deletedAt: '2026-11-02T00:00:00Z' })], TODAY),
    ).toBeNull();
  });

  it('RN-17 a budget in its grace period still receives lines, a closed one does not', () => {
    const past = { ...line, localDate: '2026-11-10' };
    expect(pickBudgetIdForLine(past, [budget()], '2026-11-20')).toBe('b1'); // grace
    expect(pickBudgetIdForLine(past, [budget()], '2026-11-21')).toBeNull(); // closed by date
    expect(pickBudgetIdForLine(past, [budget({ status: 'CLOSED' })], TODAY)).toBeNull();
  });

  it('RN-17 chooses the right one among adjacent budgets of the same category', () => {
    const first = budget({ id: 'first', startDate: '2026-11-01', endDate: '2026-11-15' });
    const second = budget({ id: 'second', startDate: '2026-11-16', endDate: '2026-11-30' });

    expect(pickBudgetIdForLine({ ...line, localDate: '2026-11-03' }, [first, second], TODAY)).toBe(
      'first',
    );
    expect(pickBudgetIdForLine({ ...line, localDate: '2026-11-20' }, [first, second], TODAY)).toBe(
      'second',
    );
  });

  it('RN-15 uses the local day: 11 p.m. on Nov 6 counts on Nov 6, not Nov 7 UTC', () => {
    const night = budget({ startDate: '2026-11-06', endDate: '2026-11-06' });

    expect(pickBudgetIdForLine({ ...line, localDate: '2026-11-06' }, [night], TODAY)).toBe('b1');
  });

  it('RN-41 describes a line with no budget as "none"', () => {
    expect(describeLineAssignment(line, [], TODAY)).toEqual({ kind: 'NONE' });
  });

  it('RN-17 describes the budget a line counts for', () => {
    expect(describeLineAssignment(line, [budget()], TODAY)).toEqual({
      kind: 'BUDGET',
      budget: budget(),
    });
  });

  it('RN-18 describes a day that falls in a closed budget so the screen can warn', () => {
    const closed = budget({ status: 'CLOSED' });

    expect(describeLineAssignment(line, [closed], TODAY)).toEqual({
      kind: 'CLOSED_BUDGET',
      budget: closed,
    });
  });
});

describe('RN-08 / RN-18 locked movements', () => {
  const movement = (budgetId: string | null): Movement => ({
    id: 'm1',
    kind: 'EXPENSE',
    currency: 'USD',
    totalMinor: 1000,
    occurredAt: '2026-11-06T10:00:00-05:00',
    localDate: '2026-11-06',
    paymentMethod: 'CASH',
    note: null,
    lines: [{ id: 'l1', categoryId: 'fun', budgetId, amountMinor: 1000 }],
    deletedAt: null,
  });

  it('RN-08 a movement counting in a closed budget cannot be edited or deleted', () => {
    expect(checkMovementEditable(movement('b1'), [budget({ status: 'CLOSED' })], TODAY)).toEqual(
      err('MOVEMENT_LOCKED'),
    );
    expect(checkMovementEditable(movement('b1'), [budget()], '2026-11-30')).toEqual(
      err('MOVEMENT_LOCKED'),
    ); // closed by date
  });

  it('RN-08 a movement in an active or grace budget, or in none, can be changed', () => {
    expect(checkMovementEditable(movement('b1'), [budget()], TODAY)).toEqual(ok(undefined));
    expect(checkMovementEditable(movement('b1'), [budget()], '2026-11-18')).toEqual(ok(undefined)); // grace
    expect(checkMovementEditable(movement(null), [budget({ status: 'CLOSED' })], TODAY)).toEqual(
      ok(undefined),
    );
  });

  it('RN-10 a movement whose budget was deleted is not locked', () => {
    const gone = budget({ status: 'CLOSED', deletedAt: '2026-11-08T00:00:00Z' });

    expect(checkMovementEditable(movement('b1'), [gone], TODAY)).toEqual(ok(undefined));
  });
});

describe('RN-33 totals per currency', () => {
  const make = (
    id: string,
    kind: Movement['kind'],
    currency: Movement['currency'],
    total: number,
    deletedAt: string | null = null,
  ): Movement => ({
    id,
    kind,
    currency,
    totalMinor: total,
    occurredAt: '2026-11-06T10:00:00-05:00',
    localDate: '2026-11-06',
    paymentMethod: 'CASH',
    note: null,
    lines: [],
    deletedAt,
  });

  it('RN-33 adds each currency apart and never mixes them', () => {
    const totals = summarizeByCurrency([
      make('1', 'EXPENSE', 'USD', 4000),
      make('2', 'EXPENSE', 'USD', 1000),
      make('3', 'REFUND', 'USD', 500),
      make('4', 'INCOME', 'COP', 2_000_000),
      make('5', 'EXPENSE', 'COP', 50_000),
    ]);

    expect(totals).toEqual([
      { currency: 'COP', expense: 50_000, refund: 0, income: 2_000_000 },
      { currency: 'USD', expense: 5000, refund: 500, income: 0 },
    ]);
  });

  it('RN-21 leaves deleted movements out', () => {
    expect(
      summarizeByCurrency([make('1', 'EXPENSE', 'USD', 4000, '2026-11-07T00:00:00Z')]),
    ).toEqual([]);
  });
});

describe('RN-23 what an income does to the envelope (sketch 4)', () => {
  // Entretenimiento USD 55 with USD 30 spent.
  const usage = { amountMinor: 5500, expenseMinor: 3000, refundMinor: 0, incomeMinor: 0 };

  it('RN-23 raises the available amount and says what would be left: US$55 -> US$70, US$40 left', () => {
    expect(describeIncomeImpact(1500, usage)).toEqual({
      availableBeforeMinor: 5500,
      availableAfterMinor: 7000,
      remainingAfterMinor: 4000,
    });
  });

  it('counts the incomes the budget already had', () => {
    expect(describeIncomeImpact(1000, { ...usage, incomeMinor: 500 })).toEqual({
      availableBeforeMinor: 6000,
      availableAfterMinor: 7000,
      remainingAfterMinor: 4000,
    });
  });

  it('RN-22 refunds lower what was spent before the income is counted', () => {
    expect(describeIncomeImpact(1500, { ...usage, refundMinor: 1000 }).remainingAfterMinor).toBe(
      5000,
    );
  });

  it('editing an income does not count its previous amount twice', () => {
    // The budget already includes this income (1500); changing it to 2000 gives 55 + 20.
    const withIt = { ...usage, incomeMinor: 1500 };

    expect(describeIncomeImpact(2000, withIt, 1500)).toEqual({
      availableBeforeMinor: 5500,
      availableAfterMinor: 7500,
      remainingAfterMinor: 4500,
    });
  });

  it('a budget already over its limit stays negative after a small income', () => {
    const over = { amountMinor: 5500, expenseMinor: 8000, refundMinor: 0, incomeMinor: 0 };

    expect(describeIncomeImpact(1000, over).remainingAfterMinor).toBe(-1500);
  });
});
