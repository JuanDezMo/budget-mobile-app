import type { CurrencyCode } from './currency';
import { err, ok } from './result';
import type { Result } from './result';

// An amount in the minor unit of its currency (cents for USD, pesos for COP).
export type Money = { amountMinor: number; currency: CurrencyCode };

export type MoneyError = 'CURRENCY_MISMATCH';

export function money(amountMinor: number, currency: CurrencyCode): Money {
  return { amountMinor, currency };
}

// RN-33: currencies are never mixed, so adding different ones is an error.
export function addMoney(a: Money, b: Money): Result<Money, MoneyError> {
  if (a.currency !== b.currency) return err('CURRENCY_MISMATCH');
  return ok(money(a.amountMinor + b.amountMinor, a.currency));
}

export function subtractMoney(a: Money, b: Money): Result<Money, MoneyError> {
  if (a.currency !== b.currency) return err('CURRENCY_MISMATCH');
  return ok(money(a.amountMinor - b.amountMinor, a.currency));
}
