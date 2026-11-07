import { describe, expect, it } from '@jest/globals';

import { parseAmountToMinor } from '@/core/shared/amount';

import { amountInputProps, formatAmountText, parseAmountInput } from './amount-input';

describe('formatAmountText (what the field shows)', () => {
  it('groups the thousands with the separator of the language', () => {
    expect(formatAmountText('1500', 'es')).toBe('1.500');
    expect(formatAmountText('1500', 'en')).toBe('1,500');
    expect(formatAmountText('1234567', 'es')).toBe('1.234.567');
    expect(formatAmountText('1234567', 'en')).toBe('1,234,567');
  });

  it('leaves short numbers and an empty field alone', () => {
    expect(formatAmountText('', 'es')).toBe('');
    expect(formatAmountText('7', 'es')).toBe('7');
    expect(formatAmountText('999', 'es')).toBe('999');
    expect(formatAmountText('1000', 'es')).toBe('1.000');
  });

  it('shows the decimals after the decimal separator of the language, and keeps a trailing one', () => {
    expect(formatAmountText('1500.5', 'es')).toBe('1.500,5');
    expect(formatAmountText('1500.50', 'en')).toBe('1,500.50');
    expect(formatAmountText('1500.', 'es')).toBe('1.500,');
    expect(formatAmountText('0.05', 'es')).toBe('0,05');
  });

  it('RN-20 handles the largest amount allowed (12 integer digits)', () => {
    expect(formatAmountText('999999999999', 'es')).toBe('999.999.999.999');
    expect(formatAmountText('999999999999.99', 'en')).toBe('999,999,999,999.99');
  });
});

describe('parseAmountInput (typing, deleting and pasting)', () => {
  it('typing a digit keeps growing the plain number', () => {
    expect(parseAmountInput('1', '', 'es')).toBe('1');
    expect(parseAmountInput('15', '1', 'es')).toBe('15');
    expect(parseAmountInput('1.5000', '1.500', 'es')).toBe('15000');
    expect(parseAmountInput('1,5000', '1,500', 'en')).toBe('15000');
  });

  it('deleting a digit shrinks it', () => {
    expect(parseAmountInput('1.50', '1.500', 'es')).toBe('150');
    expect(parseAmountInput('', '7', 'es')).toBe('');
  });

  it('deleting a grouping separator deletes the digit before it, so backspace always does something', () => {
    // "1.500" with the cursor after the dot: Android removes the dot -> "1500".
    expect(parseAmountInput('1500', '1.500', 'es')).toBe('500');
    expect(parseAmountInput('12.345.678', '12.345.678', 'es')).toBe('12345678');
    expect(parseAmountInput('1234.567', '1.234.567', 'es')).toBe('234567'); // the "1" before the first dot goes
  });

  it('a "," or "." typed at the end is the decimal point, in either language and with any keyboard', () => {
    expect(parseAmountInput('1.500,', '1.500', 'es')).toBe('1500.');
    expect(parseAmountInput('1.500.', '1.500', 'es')).toBe('1500.'); // the phone showed "."
    expect(parseAmountInput('1,500.', '1,500', 'en')).toBe('1500.');
    expect(parseAmountInput('1,500,', '1,500', 'en')).toBe('1500.'); // the phone showed ","
    expect(parseAmountInput(',', '', 'es')).toBe('.');
  });

  it('a second decimal point is ignored', () => {
    expect(parseAmountInput('1.500,5,', '1.500,5', 'es')).toBe('1500.5');
    expect(parseAmountInput('10,50.', '10,50', 'es')).toBe('10.50');
  });

  it('keeps the decimals as they are typed', () => {
    expect(parseAmountInput('1.500,5', '1.500,', 'es')).toBe('1500.5');
    expect(parseAmountInput('1.500,55', '1.500,5', 'es')).toBe('1500.55');
  });

  it('drops anything that is not a digit', () => {
    expect(parseAmountInput('12a3', '12', 'es')).toBe('123');
    expect(parseAmountInput('$ 1.500', '', 'es')).toBe('1500');
    expect(parseAmountInput('-5', '', 'es')).toBe('5');
  });

  it('a pasted amount in the format of the language is understood', () => {
    expect(parseAmountInput('1.500.000,50', '', 'es')).toBe('1500000.50');
    expect(parseAmountInput('1,500,000.50', '', 'en')).toBe('1500000.50');
  });
});

describe('what the form keeps is what saving understands', () => {
  it('RN-32 the plain text of a grouped amount converts to the same minor unit', () => {
    const typed = '1.500,5'; // as the user sees it in Spanish
    const plain = parseAmountInput(typed, '1.500,', 'es');

    expect(plain).toBe('1500.5');
    expect(parseAmountToMinor(plain, 'USD')).toEqual({ ok: true, value: 150050 });
  });

  it('a whole COP amount typed digit by digit ends as the right number', () => {
    let shown = '';
    let plain = '';
    for (const digit of '1500000') {
      plain = parseAmountInput(shown + digit, shown, 'es');
      shown = formatAmountText(plain, 'es');
    }

    expect(shown).toBe('1.500.000');
    expect(parseAmountToMinor(plain, 'COP')).toEqual({ ok: true, value: 1500000 });
  });

  it('typing 1234.56 in English ends as 1,234.56', () => {
    let shown = '';
    let plain = '';
    for (const char of '1234.56') {
      plain = parseAmountInput(shown + char, shown, 'en');
      shown = formatAmountText(plain, 'en');
    }

    expect(shown).toBe('1,234.56');
    expect(plain).toBe('1234.56');
  });
});

describe('amountInputProps', () => {
  it('shows the grouped text and gives back the plain one', () => {
    let plain = '1500';
    const props = amountInputProps(plain, (next) => (plain = next), 'es');

    expect(props.value).toBe('1.500');
    props.onChangeText('1.5000');
    expect(plain).toBe('15000');
  });
});
