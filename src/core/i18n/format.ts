import { enUS, es } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';
import type { Locale } from 'date-fns';

import { CURRENCY_DECIMALS } from '@/core/shared/currency';
import type { Money } from '@/core/shared/money';
import type { LocalDate } from '@/core/shared/dates';

import type { AppLanguage } from '@/core/shared/app-preferences';

const INTL_LOCALE: Record<AppLanguage, string> = { es: 'es-CO', en: 'en-US' };
const DATE_FNS_LOCALE: Record<AppLanguage, Locale> = { es, en: enUS };

// "USD 1,250.50" style amount for the screen. Only for display: the stored value is always
// the integer in the minor unit.
export function formatMoney(value: Money, language: AppLanguage): string {
  const decimals = CURRENCY_DECIMALS[value.currency];

  return new Intl.NumberFormat(INTL_LOCALE[language], {
    style: 'currency',
    currency: value.currency,
    currencyDisplay: 'code',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value.amountMinor / 10 ** decimals);
}

export function formatPercentage(value: number, language: AppLanguage): string {
  return new Intl.NumberFormat(INTL_LOCALE[language], {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value / 100);
}

// A calendar day for the screen, e.g. "6 nov 2026" / "Nov 6, 2026".
export function formatLocalDate(date: LocalDate, language: AppLanguage): string {
  const pattern = language === 'es' ? 'd MMM yyyy' : 'MMM d, yyyy';

  return format(parseISO(date), pattern, { locale: DATE_FNS_LOCALE[language] });
}

// Country name in the current language (RN-42). Falls back to the code if the engine has no
// country names (Intl.DisplayNames is not available everywhere).
export function formatCountryName(code: string, language: AppLanguage): string {
  try {
    return new Intl.DisplayNames([INTL_LOCALE[language]], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
