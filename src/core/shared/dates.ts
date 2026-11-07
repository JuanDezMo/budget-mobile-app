import { addDays, formatISO, isValid, parseISO } from 'date-fns';

// A calendar day as text, `YYYY-MM-DD`, with no time zone. Budgets and movements compare
// days as text, so a day never shifts when the user changes time zone.
export type LocalDate = string;

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const OCCURRED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;

// True only for real calendar days ("2026-02-30" is rejected).
export function isValidLocalDate(value: string): boolean {
  return LOCAL_DATE_PATTERN.test(value) && isValid(parseISO(value));
}

export function toLocalDate(date: Date): LocalDate {
  return formatISO(date, { representation: 'date' });
}

// Today's day on the device clock (RN-15, RN-16, RN-05).
export function todayLocalDate(now: Date = new Date()): LocalDate {
  return toLocalDate(now);
}

// RN-15: when a movement happened, in local time with its UTC offset,
// e.g. `2026-11-06T23:10:00-05:00`.
export function toOccurredAt(date: Date): string {
  return formatISO(date);
}

export function isValidOccurredAt(value: string): boolean {
  return OCCURRED_AT_PATTERN.test(value) && isValid(parseISO(value));
}

// The day exactly as written in `occurred_at`, with no conversion to the current time zone.
export function localDateOf(occurredAt: string): LocalDate {
  return occurredAt.slice(0, 10);
}

// -1, 0 or 1. Plain text comparison works because the format is fixed-width.
export function compareLocalDates(a: LocalDate, b: LocalDate): -1 | 0 | 1 {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function addDaysToLocalDate(date: LocalDate, days: number): LocalDate {
  return toLocalDate(addDays(parseISO(date), days));
}

// Both ends included (RN-17: `start <= day <= end`).
export function isDateInRange(date: LocalDate, start: LocalDate, end: LocalDate): boolean {
  return compareLocalDates(date, start) >= 0 && compareLocalDates(date, end) <= 0;
}

// RN-03: two ranges overlap when `a.start <= b.end AND a.end >= b.start`.
export function rangesOverlap(
  a: { start: LocalDate; end: LocalDate },
  b: { start: LocalDate; end: LocalDate },
): boolean {
  return compareLocalDates(a.start, b.end) <= 0 && compareLocalDates(a.end, b.start) >= 0;
}

// RN-16: a movement cannot be dated after today.
export function isFutureDate(date: LocalDate, today: LocalDate): boolean {
  return compareLocalDates(date, today) > 0;
}
