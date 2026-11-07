// Supported currencies (RN-32). Amounts are stored as integers in the minor unit,
// and `decimals` says how many digits that unit has (COP 0, USD 2, EUR 2).
export const CURRENCY_CODES = ['COP', 'USD', 'EUR'] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export const CURRENCY_DECIMALS: Readonly<Record<CurrencyCode, number>> = {
  COP: 0,
  USD: 2,
  EUR: 2,
};

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return CURRENCY_CODES.some((code) => code === value);
}
