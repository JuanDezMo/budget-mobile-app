import { describe, expect, it } from '@jest/globals';

import { formatMinorToText, parseAmountToMinor } from './amount';
import { err, ok } from './result';

describe('amount conversion', () => {
  it('RN-32 converts text to the minor unit using the currency decimals', () => {
    expect(parseAmountToMinor('12.5', 'USD')).toEqual(ok(1250));
    expect(parseAmountToMinor('12,50', 'EUR')).toEqual(ok(1250));
    expect(parseAmountToMinor('7', 'USD')).toEqual(ok(700));
    expect(parseAmountToMinor('15000', 'COP')).toEqual(ok(15000));
    expect(parseAmountToMinor('0.05', 'USD')).toEqual(ok(5));
  });

  it('RN-20 rejects more decimals than the currency allows', () => {
    expect(parseAmountToMinor('10.123', 'USD')).toEqual(err('AMOUNT_TOO_MANY_DECIMALS'));
    expect(parseAmountToMinor('10.5', 'COP')).toEqual(err('AMOUNT_TOO_MANY_DECIMALS'));
  });

  it('RN-20 accepts up to 12 integer digits and rejects 13', () => {
    expect(parseAmountToMinor('999999999999', 'COP')).toEqual(ok(999999999999));
    expect(parseAmountToMinor('999999999999.99', 'USD')).toEqual(ok(99999999999999));
    expect(parseAmountToMinor('1000000000000', 'COP')).toEqual(err('AMOUNT_TOO_LARGE'));
  });

  it('RN-20 does not count leading zeros as integer digits', () => {
    expect(parseAmountToMinor('0000000000001', 'COP')).toEqual(ok(1));
  });

  it('rejects text that is not an amount', () => {
    for (const text of ['', ' ', 'abc', '-5', '1.2.3', '1e3', '.5', '1 000']) {
      expect(parseAmountToMinor(text, 'USD')).toEqual(err('AMOUNT_INVALID'));
    }
  });

  it('formats the minor unit back to editable text', () => {
    expect(formatMinorToText(1250, 'USD')).toBe('12.50');
    expect(formatMinorToText(5, 'USD')).toBe('0.05');
    expect(formatMinorToText(15000, 'COP')).toBe('15000');
    expect(formatMinorToText(-150, 'EUR')).toBe('-1.50');
  });

  it('round-trips text -> minor -> text', () => {
    const parsed = parseAmountToMinor('1234.56', 'USD');
    expect(parsed.ok && formatMinorToText(parsed.value, 'USD')).toBe('1234.56');
  });
});
