import { describe, expect, it } from '@jest/globals';

import {
  formatCountryName,
  formatDateRange,
  formatLocalDate,
  formatMoney,
  formatPercentage,
  formatShortDate,
  formatTime,
  joinWithAnd,
} from './format';
import { resolveInitialLanguage } from '@/core/shared/app-preferences';
import { COUNTRY_CODES } from '@/core/shared/countries';
import en from './locales/en.json';
import es from './locales/es.json';

// Collects "a.b.c" paths of every translated string.
function keyPaths(node: unknown, prefix = ''): string[] {
  if (typeof node !== 'object' || node === null) return [prefix];

  return Object.entries(node).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('i18n', () => {
  it('es.json and en.json have exactly the same keys', () => {
    expect(keyPaths(es).sort()).toEqual(keyPaths(en).sort());
  });

  it('follows the device language only when it is es or en', () => {
    expect(resolveInitialLanguage('en')).toBe('en');
    expect(resolveInitialLanguage('es')).toBe('es');
    expect(resolveInitialLanguage('fr')).toBe('es');
    expect(resolveInitialLanguage(null)).toBe('es');
  });

  it('RN-32 formats money with the decimals of each currency', () => {
    const cop = formatMoney({ amountMinor: 1500000, currency: 'COP' }, 'es').replace(/\s/g, ' ');
    const usd = formatMoney({ amountMinor: 125050, currency: 'USD' }, 'en').replace(/\s/g, ' ');

    expect(cop).toContain('1.500.000');
    expect(cop).not.toContain(',');
    expect(usd).toContain('1,250.50');
  });

  it('formats a percentage', () => {
    expect(formatPercentage(42.9, 'en')).toBe('42.9%');
  });

  it('formats a calendar day by language', () => {
    expect(formatLocalDate('2026-11-06', 'en')).toBe('Nov 6, 2026');
    expect(formatLocalDate('2026-11-06', 'es')).toMatch(/^6 nov\.? 2026$/);
  });

  it('RN-42 every country code has a name in both languages', () => {
    for (const code of COUNTRY_CODES) {
      expect(formatCountryName(code, 'es')).not.toBe(code);
      expect(formatCountryName(code, 'en')).not.toBe(code);
    }
  });

  it('RN-42 names a country in the current language', () => {
    expect(formatCountryName('CO', 'en')).toBe('Colombia');
    expect(formatCountryName('US', 'es')).toBe('Estados Unidos');
    expect(formatCountryName('ES', 'en')).toBe('Spain');
    expect(formatCountryName('ZZ', 'en')).toBe('ZZ'); // unknown code: shown as is
  });

  it('writes a short date range for a card', () => {
    expect(formatDateRange('2026-11-01', '2026-11-15', 'es')).toMatch(/^1–15 nov\.?$/);
    expect(formatDateRange('2026-11-01', '2026-11-15', 'en')).toBe('Nov 1–15');
    expect(formatDateRange('2026-11-28', '2026-12-05', 'es')).toMatch(/^28 nov\.? – 5 dic\.?$/);
    expect(formatDateRange('2026-11-28', '2026-12-05', 'en')).toBe('Nov 28 – Dec 5');
  });

  it('writes a day and month', () => {
    expect(formatShortDate('2026-11-07', 'en')).toBe('Nov 7');
    expect(formatShortDate('2026-11-07', 'es')).toMatch(/^7 nov\.?$/);
  });

  it('joins amounts in a sentence', () => {
    expect(joinWithAnd([], 'y')).toBe('');
    expect(joinWithAnd(['A'], 'y')).toBe('A');
    expect(joinWithAnd(['A', 'B'], 'y')).toBe('A y B');
    expect(joinWithAnd(['A', 'B', 'C'], 'and')).toBe('A, B and C');
  });

  it('writes a time of day', () => {
    expect(formatTime('19:42', 'en')).toBe('7:42 PM');
    expect(formatTime('19:42', 'es')).toMatch(/^7:42 p\.\s?m\.$/);
    expect(formatTime('00:05', 'en')).toBe('12:05 AM');
  });
});
