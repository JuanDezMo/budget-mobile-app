import { describe, expect, it } from '@jest/globals';

import {
  addDaysToLocalDate,
  compareLocalDates,
  isDateInRange,
  isFutureDate,
  isValidLocalDate,
  isValidOccurredAt,
  localDateOf,
  rangesOverlap,
  toLocalDate,
  toOccurredAt,
  todayLocalDate,
} from './dates';

describe('dates', () => {
  it('validates real calendar days only', () => {
    expect(isValidLocalDate('2026-11-06')).toBe(true);
    expect(isValidLocalDate('2028-02-29')).toBe(true);
    expect(isValidLocalDate('2026-02-29')).toBe(false);
    expect(isValidLocalDate('2026-13-01')).toBe(false);
    expect(isValidLocalDate('6/11/2026')).toBe(false);
  });

  it('RN-15 keeps local time with its offset and the day as written', () => {
    const occurredAt = '2026-11-06T23:10:00-05:00';

    expect(isValidOccurredAt(occurredAt)).toBe(true);
    expect(localDateOf(occurredAt)).toBe('2026-11-06');
    expect(isValidOccurredAt('2026-11-06 23:10')).toBe(false);
  });

  it('RN-15 toOccurredAt writes an instant that reads back to the same moment', () => {
    const now = new Date(2026, 10, 6, 23, 10, 0);
    const occurredAt = toOccurredAt(now);

    expect(isValidOccurredAt(occurredAt)).toBe(true);
    expect(new Date(occurredAt).getTime()).toBe(now.getTime());
    expect(localDateOf(occurredAt)).toBe(toLocalDate(now));
  });

  it('todayLocalDate uses the device calendar day', () => {
    expect(todayLocalDate(new Date(2026, 10, 6, 23, 59))).toBe('2026-11-06');
    expect(todayLocalDate(new Date(2026, 10, 7, 0, 0))).toBe('2026-11-07');
  });

  it('compares days as text', () => {
    expect(compareLocalDates('2026-11-06', '2026-11-07')).toBe(-1);
    expect(compareLocalDates('2026-11-07', '2026-11-06')).toBe(1);
    expect(compareLocalDates('2026-11-06', '2026-11-06')).toBe(0);
  });

  it('RN-38 adds days across month and year ends (grace period uses +5)', () => {
    expect(addDaysToLocalDate('2026-11-28', 5)).toBe('2026-12-03');
    expect(addDaysToLocalDate('2026-12-29', 5)).toBe('2027-01-03');
    expect(addDaysToLocalDate('2028-02-27', 2)).toBe('2028-02-29');
  });

  it('RN-17 includes both ends of a range', () => {
    expect(isDateInRange('2026-11-01', '2026-11-01', '2026-11-15')).toBe(true);
    expect(isDateInRange('2026-11-15', '2026-11-01', '2026-11-15')).toBe(true);
    expect(isDateInRange('2026-11-16', '2026-11-01', '2026-11-15')).toBe(false);
    expect(isDateInRange('2026-10-31', '2026-11-01', '2026-11-15')).toBe(false);
  });

  it('RN-03 detects overlapping ranges, including a shared day', () => {
    const base = { start: '2026-11-01', end: '2026-11-15' };

    expect(rangesOverlap(base, { start: '2026-11-15', end: '2026-11-30' })).toBe(true);
    expect(rangesOverlap(base, { start: '2026-11-05', end: '2026-11-06' })).toBe(true);
    expect(rangesOverlap(base, { start: '2026-10-01', end: '2026-12-01' })).toBe(true);
    expect(rangesOverlap(base, { start: '2026-11-16', end: '2026-11-30' })).toBe(false);
    expect(rangesOverlap(base, { start: '2026-10-01', end: '2026-10-31' })).toBe(false);
  });

  it('RN-16 flags only days after today as future', () => {
    expect(isFutureDate('2026-11-07', '2026-11-06')).toBe(true);
    expect(isFutureDate('2026-11-06', '2026-11-06')).toBe(false);
    expect(isFutureDate('2026-11-05', '2026-11-06')).toBe(false);
  });
});
