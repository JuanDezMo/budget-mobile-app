import { enUS, es } from 'date-fns/locale';
import { format, parse, parseISO } from 'date-fns';
import type { Locale } from 'date-fns';

import { CURRENCY_DECIMALS } from '@/core/shared/currency';
import type { Money } from '@/core/shared/money';
import type { LocalDate } from '@/core/shared/dates';

import COUNTRY_NAMES from './country-names.json';

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

// Country name in the current language (RN-42). It reads our own table because Hermes has no
// country names in Intl.DisplayNames; an unknown code falls back to the code itself.
export function formatCountryName(code: string, language: AppLanguage): string {
  const names: Record<string, string> = COUNTRY_NAMES[language];
  return names[code] ?? code;
}

// A short range for a card: "1–15 nov" in the same month, "28 nov – 5 dic" across months.
export function formatDateRange(start: LocalDate, end: LocalDate, language: AppLanguage): string {
  const locale = DATE_FNS_LOCALE[language];
  const from = parseISO(start);
  const to = parseISO(end);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);

  if (sameMonth) {
    const month = format(to, 'MMM', { locale });
    return language === 'es'
      ? `${format(from, 'd')}–${format(to, 'd')} ${month}`
      : `${month} ${format(from, 'd')}–${format(to, 'd')}`;
  }
  const short = (date: Date) => format(date, language === 'es' ? 'd MMM' : 'MMM d', { locale });

  return `${short(from)} – ${short(to)}`;
}

// Day and month only, e.g. "7 nov" / "Nov 7".
export function formatShortDate(date: LocalDate, language: AppLanguage): string {
  return format(parseISO(date), language === 'es' ? 'd MMM' : 'MMM d', {
    locale: DATE_FNS_LOCALE[language],
  });
}

// "A, B y C" / "A, B and C": a list of amounts in a sentence.
export function joinWithAnd(items: readonly string[], andWord: string): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${andWord} ${items[items.length - 1] ?? ''}`;
}

// A time of day for the screen: "7:42 p. m." in Spanish, "7:42 PM" in English. Input is `HH:mm`.
export function formatTime(time: string, language: AppLanguage): string {
  const date = parse(time, 'HH:mm', new Date());
  const pm = date.getHours() >= 12;
  const suffix = language === 'es' ? (pm ? 'p. m.' : 'a. m.') : pm ? 'PM' : 'AM';

  return `${format(date, 'h:mm')} ${suffix}`;
}
