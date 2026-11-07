import { CURRENCY_DECIMALS } from './currency';
import type { CurrencyCode } from './currency';
import { err, ok } from './result';
import type { Result } from './result';

// RN-20: amounts use the decimals of their currency and at most 12 integer digits.
export const MAX_INTEGER_DIGITS = 12;

export type AmountError = 'AMOUNT_INVALID' | 'AMOUNT_TOO_MANY_DECIMALS' | 'AMOUNT_TOO_LARGE';

// Accepts digits with an optional "." or "," as decimal separator ("12.5", "12,50", "1200").
// Thousands separators and signs are not accepted: the input field must not send them.
// Works on the text, never on floats, so there are no rounding errors.
export function parseAmountToMinor(
  text: string,
  currency: CurrencyCode,
): Result<number, AmountError> {
  const trimmed = text.trim();
  if (!/^\d+([.,]\d*)?$/.test(trimmed)) return err('AMOUNT_INVALID');

  const [integerPart = '', decimalPart = ''] = trimmed.split(/[.,]/);
  const decimals = CURRENCY_DECIMALS[currency];

  if (decimalPart.length > decimals) return err('AMOUNT_TOO_MANY_DECIMALS');

  const integerDigits = integerPart.replace(/^0+(?=\d)/, '');
  if (integerDigits.length > MAX_INTEGER_DIGITS) return err('AMOUNT_TOO_LARGE');

  const minorDigits = integerDigits + decimalPart.padEnd(decimals, '0');
  return ok(Number(minorDigits));
}

// Plain editable text for a stored amount ("1250" USD -> "12.50"). For display use Intl (T1.5).
export function formatMinorToText(amountMinor: number, currency: CurrencyCode): string {
  const decimals = CURRENCY_DECIMALS[currency];
  const sign = amountMinor < 0 ? '-' : '';
  const digits = String(Math.abs(amountMinor)).padStart(decimals + 1, '0');
  if (decimals === 0) return sign + digits;

  return `${sign}${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`;
}
