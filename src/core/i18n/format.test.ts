import { describe, expect, it } from '@jest/globals';

import { formatLocalDate, formatMoney, formatPercentage } from './format';
import { resolveInitialLanguage } from '@/core/shared/app-preferences';
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
});
