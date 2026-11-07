import { describe, expect, it } from '@jest/globals';

import {
  barFillPercentage,
  calculateBudgetUsage,
  calculateUsage,
  getUsageState,
  summarizeOpenBudgets,
} from './budget-usage.rules';
import type { Budget, UsageTotals } from './budget.types';

const totals = (expense: number, refund = 0, income = 0): UsageTotals => ({
  expenseMinor: expense,
  refundMinor: refund,
  incomeMinor: income,
});

const budget: Budget = {
  id: 'b1',
  categoryId: 'ent',
  currency: 'USD',
  amountMinor: 5500,
  startDate: '2026-11-01',
  endDate: '2026-11-15',
  status: 'ACTIVE',
  spentFinalMinor: null,
  closedAt: null,
  deletedAt: null,
};

describe('usage calculation', () => {
  it('RN-22 / RN-23 the example: USD 55, expenses 40, refund 10, income 15 -> 42.9%', () => {
    const usage = calculateUsage(5500, totals(4000, 1000, 1500));

    expect(usage.spentMinor).toBe(3000); // 40 - 10
    expect(usage.availableMinor).toBe(7000); // 55 + 15
    expect(usage.remainingMinor).toBe(4000);
    expect(usage.percentage).toBeCloseTo(42.857, 3);
    expect(usage.percentage.toFixed(1)).toBe('42.9');
  });

  it('with no movements nothing is spent and the whole amount is left', () => {
    expect(calculateUsage(5500, totals(0))).toEqual({
      spentMinor: 0,
      availableMinor: 5500,
      remainingMinor: 5500,
      percentage: 0,
    });
  });

  it('RN-22 a refund lowers what was spent but never below 0', () => {
    expect(calculateUsage(5500, totals(500, 900)).spentMinor).toBe(0);
    expect(calculateUsage(5500, totals(900, 300)).spentMinor).toBe(600);
  });

  it('RN-23 an income raises the available amount and lowers the percentage', () => {
    const without = calculateUsage(5500, totals(2750));
    const withIncome = calculateUsage(5500, totals(2750, 0, 5500));

    expect(without.percentage).toBe(50);
    expect(withIncome.availableMinor).toBe(11000);
    expect(withIncome.percentage).toBe(25);
  });

  it('RN-11 spending past the amount gives more than 100% and a negative remainder', () => {
    const usage = calculateUsage(5500, totals(8250));

    expect(usage.percentage).toBe(150);
    expect(usage.remainingMinor).toBe(-2750);
  });

  it('spending exactly the available amount is 100% with nothing left', () => {
    const usage = calculateUsage(5500, totals(5500));

    expect(usage.percentage).toBe(100);
    expect(usage.remainingMinor).toBe(0);
  });

  it('works with COP, where the minor unit is the peso', () => {
    const usage = calculateUsage(500000, totals(125000));

    expect(usage.percentage).toBe(25);
    expect(usage.remainingMinor).toBe(375000);
  });
});

describe('RN-05 closed budgets show the frozen spent amount', () => {
  it('uses spent_final_minor for a closed budget', () => {
    const closed: Budget = { ...budget, status: 'CLOSED', spentFinalMinor: 3000 };

    const usage = calculateBudgetUsage(closed, totals(9999));

    expect(usage.spentMinor).toBe(3000);
    expect(usage.remainingMinor).toBe(2500);
    expect(usage.percentage).toBeCloseTo(54.5, 1);
  });

  it('an active budget is calculated live', () => {
    expect(calculateBudgetUsage(budget, totals(1000)).spentMinor).toBe(1000);
  });
});

describe('usage state', () => {
  it('RN-29 more than 100% is exceeded, in any phase', () => {
    const over = calculateUsage(5500, totals(6000));

    expect(getUsageState(over, 'ACTIVE')).toBe('EXCEEDED');
    expect(getUsageState(over, 'GRACE')).toBe('EXCEEDED');
    expect(getUsageState(over, 'CLOSED')).toBe('EXCEEDED');
  });

  it('RN-29 exactly 100% is not exceeded', () => {
    expect(getUsageState(calculateUsage(5500, totals(5500)), 'ACTIVE')).toBe('NORMAL');
  });

  it('RN-09 a closed budget with money left shows it as saved', () => {
    const left = calculateUsage(5500, totals(3000));

    expect(getUsageState(left, 'CLOSED')).toBe('SAVED');
    expect(getUsageState(left, 'ACTIVE')).toBe('NORMAL');
    expect(getUsageState(left, 'GRACE')).toBe('NORMAL');
  });

  it('RN-09 a closed budget spent to the last cent saves nothing', () => {
    expect(getUsageState(calculateUsage(5500, totals(5500)), 'CLOSED')).toBe('NORMAL');
  });

  it('the bar never passes full, nor goes below empty', () => {
    expect(barFillPercentage(calculateUsage(5500, totals(8250)))).toBe(100);
    expect(barFillPercentage(calculateUsage(5500, totals(2750)))).toBe(50);
    expect(barFillPercentage(calculateUsage(5500, totals(0)))).toBe(0);
  });
});

describe('RN-33 overall summary per currency', () => {
  const item = (
    currency: 'USD' | 'COP',
    phase: 'ACTIVE' | 'GRACE' | 'CLOSED',
    amount: number,
    spent: number,
  ) => ({
    currency,
    phase,
    usage: calculateUsage(amount, totals(spent)),
  });

  it('RN-33 adds each currency apart and never mixes them', () => {
    const summary = summarizeOpenBudgets([
      item('USD', 'ACTIVE', 5500, 3000),
      item('USD', 'GRACE', 10000, 2000),
      item('COP', 'ACTIVE', 500000, 125000),
    ]);

    expect(summary).toEqual([
      { currency: 'COP', availableMinor: 500000, spentMinor: 125000, remainingMinor: 375000 },
      { currency: 'USD', availableMinor: 15500, spentMinor: 5000, remainingMinor: 10500 },
    ]);
  });

  it('leaves closed budgets out of what is left to spend', () => {
    expect(summarizeOpenBudgets([item('USD', 'CLOSED', 5500, 1000)])).toEqual([]);
  });

  it('an exceeded budget subtracts from the remainder of its currency', () => {
    const summary = summarizeOpenBudgets([
      item('USD', 'ACTIVE', 5500, 7000),
      item('USD', 'ACTIVE', 5500, 1000),
    ]);

    expect(summary[0]?.remainingMinor).toBe(3000); // -1500 + 4500
  });

  it('is empty with no budgets', () => {
    expect(summarizeOpenBudgets([])).toEqual([]);
  });
});
