import { describe, expect, it } from '@jest/globals';

import { err, ok } from '@/core/shared/result';

import type { Category } from '../categories/category.types';
import {
  checkCanEditBudget,
  checkCurrencyUnchanged,
  checkNewBudgetData,
  checkNoOverlap,
  getBudgetPhase,
  isAmountBelowSpent,
  shouldCloseBudget,
} from './budget.rules';
import type { Budget, NewBudget } from './budget.types';

const entretenimiento: Category = {
  id: 'cat-ent',
  isSystem: true,
  code: 'ENTRETENIMIENTO',
  icon: 'film',
  color: '#7A4FD0',
  archivedAt: null,
};
const sinClasificar: Category = { ...entretenimiento, id: 'cat-sin', code: 'SIN_CLASIFICAR' };
const archivada: Category = {
  id: 'cat-old',
  isSystem: false,
  name: 'Vieja',
  icon: 'star',
  color: '#5C6570',
  archivedAt: '2026-10-01T00:00:00Z',
};

const budget: Budget = {
  id: 'b1',
  categoryId: 'cat-ent',
  currency: 'USD',
  amountMinor: 5500,
  startDate: '2026-11-01',
  endDate: '2026-11-15',
  status: 'ACTIVE',
  spentFinalMinor: null,
  closedAt: null,
  deletedAt: null,
};

const input: NewBudget = {
  categoryId: 'cat-ent',
  currency: 'USD',
  amountMinor: 5500,
  startDate: '2026-11-01',
  endDate: '2026-11-15',
};

describe('RN-01 required data', () => {
  it('RN-01 accepts category, currency, amount > 0 and start <= end', () => {
    expect(checkNewBudgetData(input, entretenimiento)).toEqual(ok(input));
  });

  it('RN-01 accepts a one-day budget (start = end)', () => {
    const oneDay = { ...input, endDate: '2026-11-01' };

    expect(checkNewBudgetData(oneDay, entretenimiento)).toEqual(ok(oneDay));
  });

  it('RN-01 rejects an amount of 0, a negative one or a non-integer', () => {
    for (const amountMinor of [0, -5, 10.5]) {
      expect(checkNewBudgetData({ ...input, amountMinor }, entretenimiento)).toEqual(
        err('BUDGET_AMOUNT_INVALID'),
      );
    }
  });

  it('RN-01 rejects a start date after the end date', () => {
    const backwards = { ...input, startDate: '2026-11-16' };

    expect(checkNewBudgetData(backwards, entretenimiento)).toEqual(err('BUDGET_DATES_INVALID'));
  });

  it('RN-40 rejects SIN_CLASIFICAR and RN-36 an archived category', () => {
    expect(checkNewBudgetData(input, sinClasificar)).toEqual(err('CATEGORY_NO_BUDGET_ALLOWED'));
    expect(checkNewBudgetData(input, archivada)).toEqual(err('CATEGORY_ARCHIVED'));
  });
});

describe('RN-02 fixed currency', () => {
  it('RN-02 refuses a different currency and accepts the same one', () => {
    expect(checkCurrencyUnchanged(budget, 'EUR')).toEqual(err('BUDGET_CURRENCY_LOCKED'));
    expect(checkCurrencyUnchanged(budget, 'USD')).toEqual(ok(undefined));
  });
});

describe('RN-03 no overlap', () => {
  const other: Budget = { ...budget, id: 'b2', startDate: '2026-11-16', endDate: '2026-11-30' };
  const candidate = (startDate: string, endDate: string) => ({
    categoryId: 'cat-ent',
    startDate,
    endDate,
  });

  it('RN-03 rejects ranges that cross, even by one day, whatever the currency', () => {
    const inEuros = { ...budget, currency: 'EUR' as const };

    expect(checkNoOverlap(candidate('2026-11-10', '2026-11-20'), [inEuros])).toEqual(
      err('BUDGET_OVERLAP'),
    );
    expect(checkNoOverlap(candidate('2026-11-15', '2026-11-20'), [budget])).toEqual(
      err('BUDGET_OVERLAP'),
    );
    expect(checkNoOverlap(candidate('2026-10-01', '2026-12-31'), [budget])).toEqual(
      err('BUDGET_OVERLAP'),
    );
  });

  it('RN-03 accepts the next day, an earlier range and another category', () => {
    expect(checkNoOverlap(candidate('2026-11-16', '2026-11-30'), [budget])).toEqual(ok(undefined));
    expect(checkNoOverlap(candidate('2026-10-01', '2026-10-31'), [budget])).toEqual(ok(undefined));
    expect(
      checkNoOverlap({ ...candidate('2026-11-05', '2026-11-06'), categoryId: 'other' }, [budget]),
    ).toEqual(ok(undefined));
  });

  it('RN-10 a deleted budget does not block the dates', () => {
    const deleted = { ...budget, deletedAt: '2026-11-02T00:00:00Z' };

    expect(checkNoOverlap(candidate('2026-11-05', '2026-11-06'), [deleted])).toEqual(ok(undefined));
  });

  it('RN-03 editing a budget does not collide with itself', () => {
    expect(checkNoOverlap(candidate('2026-11-01', '2026-11-20'), [budget, other], 'b1')).toEqual(
      err('BUDGET_OVERLAP'), // it now reaches b2
    );
    expect(checkNoOverlap(candidate('2026-11-01', '2026-11-12'), [budget, other], 'b1')).toEqual(
      ok(undefined),
    );
  });
});

describe('RN-05 / RN-38 phases', () => {
  it('RN-05 is ACTIVE until the end date, included', () => {
    expect(getBudgetPhase(budget, '2026-11-01')).toBe('ACTIVE');
    expect(getBudgetPhase(budget, '2026-11-15')).toBe('ACTIVE');
  });

  it('RN-05 / RN-38 is in GRACE for the 5 days after the end date', () => {
    expect(getBudgetPhase(budget, '2026-11-16')).toBe('GRACE');
    expect(getBudgetPhase(budget, '2026-11-20')).toBe('GRACE');
  });

  it('RN-05 / RN-38 is CLOSED from the 6th day after the end date', () => {
    expect(getBudgetPhase(budget, '2026-11-21')).toBe('CLOSED');
    expect(getBudgetPhase(budget, '2027-03-01')).toBe('CLOSED');
  });

  it('RN-38 counts the grace days across a month and year end', () => {
    const december = { ...budget, startDate: '2026-12-20', endDate: '2026-12-29' };

    expect(getBudgetPhase(december, '2027-01-03')).toBe('GRACE');
    expect(getBudgetPhase(december, '2027-01-04')).toBe('CLOSED');
  });

  it('RN-05 a budget stored as CLOSED stays closed', () => {
    expect(getBudgetPhase({ ...budget, status: 'CLOSED' }, '2026-11-02')).toBe('CLOSED');
  });

  it('RN-05 only an ACTIVE budget past its grace is closed on app open', () => {
    expect(shouldCloseBudget(budget, '2026-11-20')).toBe(false);
    expect(shouldCloseBudget(budget, '2026-11-21')).toBe(true);
    expect(shouldCloseBudget({ ...budget, status: 'CLOSED' }, '2026-12-01')).toBe(false);
    expect(shouldCloseBudget({ ...budget, deletedAt: '2026-11-02T00:00:00Z' }, '2026-12-01')).toBe(
      false,
    );
  });
});

describe('RN-06 / RN-07 / RN-08 editing', () => {
  it('RN-06 / RN-07 allows editing only while ACTIVE', () => {
    expect(checkCanEditBudget(budget, '2026-11-15')).toEqual(ok(undefined));
    expect(checkCanEditBudget(budget, '2026-11-16')).toEqual(err('BUDGET_NOT_EDITABLE')); // grace
    expect(checkCanEditBudget(budget, '2026-11-21')).toEqual(err('BUDGET_NOT_EDITABLE'));
  });

  it('RN-08 a closed budget cannot be edited', () => {
    expect(checkCanEditBudget({ ...budget, status: 'CLOSED' }, '2026-11-02')).toEqual(
      err('BUDGET_NOT_EDITABLE'),
    );
  });

  it('RN-06 warns when the new amount is below what was spent, but only then', () => {
    expect(isAmountBelowSpent(3000, 4000)).toBe(true);
    expect(isAmountBelowSpent(4000, 4000)).toBe(false);
    expect(isAmountBelowSpent(5000, 4000)).toBe(false);
  });
});
