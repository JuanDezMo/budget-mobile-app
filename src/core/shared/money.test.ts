import { describe, expect, it } from '@jest/globals';

import { isCurrencyCode } from './currency';
import { addMoney, money, subtractMoney } from './money';
import { err, ok } from './result';

describe('Money', () => {
  it('RN-32 only COP, USD and EUR are valid currency codes', () => {
    expect(isCurrencyCode('COP')).toBe(true);
    expect(isCurrencyCode('USD')).toBe(true);
    expect(isCurrencyCode('EUR')).toBe(true);
    expect(isCurrencyCode('GBP')).toBe(false);
    expect(isCurrencyCode(null)).toBe(false);
  });

  it('adds amounts of the same currency', () => {
    expect(addMoney(money(1050, 'USD'), money(250, 'USD'))).toEqual(ok(money(1300, 'USD')));
  });

  it('subtracts amounts of the same currency and can go negative', () => {
    expect(subtractMoney(money(100, 'COP'), money(250, 'COP'))).toEqual(ok(money(-150, 'COP')));
  });

  it('RN-33 rejects adding or subtracting different currencies', () => {
    expect(addMoney(money(100, 'USD'), money(100, 'EUR'))).toEqual(err('CURRENCY_MISMATCH'));
    expect(subtractMoney(money(100, 'USD'), money(100, 'COP'))).toEqual(err('CURRENCY_MISMATCH'));
  });
});
