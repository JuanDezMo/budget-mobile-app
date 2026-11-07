import { describe, expect, it } from '@jest/globals';

import { err, flatMapResult, mapResult, ok } from './result';
import type { Result } from './result';

const failedBefore = (): Result<number, string> => err('BEFORE');

describe('Result', () => {
  it('ok wraps a value and is flagged as successful', () => {
    const result = ok(5);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(5);
  });

  it('err wraps an error code and is flagged as failed', () => {
    const result = err('BUDGET_OVERLAP');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('BUDGET_OVERLAP');
  });

  it('mapResult transforms a success and keeps an error as is', () => {
    const parse = (fails: boolean): Result<number, string> => (fails ? err('X') : ok(2));
    const success = parse(false);
    const failure = parse(true);

    expect(mapResult(success, (n) => n * 3)).toEqual(ok(6));
    expect(mapResult(failure, (n) => n * 3)).toEqual(err('X'));
  });

  it('flatMapResult stops at the first error', () => {
    const half = (n: number): Result<number, string> => (n % 2 === 0 ? ok(n / 2) : err('ODD'));

    expect(flatMapResult(ok(8), half)).toEqual(ok(4));
    expect(flatMapResult(ok(7), half)).toEqual(err('ODD'));
    expect(flatMapResult(failedBefore(), half)).toEqual(err('BEFORE'));
  });
});
