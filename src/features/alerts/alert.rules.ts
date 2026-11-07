import { err, ok } from '@/core/shared/result';
import type { Result } from '@/core/shared/result';

import { AUTOMATIC_THRESHOLD_PERCENTAGE, MAX_CONFIGURABLE_THRESHOLDS } from './alert.types';
import type { EvaluationDecision, Threshold } from './alert.types';

export type ThresholdError =
  'THRESHOLD_TOO_MANY' | 'THRESHOLD_INVALID' | 'THRESHOLD_DUPLICATE' | 'THRESHOLD_AUTOMATIC';

// RN-24: from 0 to 3 whole numbers between 1 and 100, none repeated. RN-25: the 100% always
// exists on its own (automatic), so it cannot also be chosen. Returns them sorted.
export function validateConfigurableThresholds(
  percentages: readonly number[],
): Result<number[], ThresholdError> {
  if (percentages.length > MAX_CONFIGURABLE_THRESHOLDS) return err('THRESHOLD_TOO_MANY');
  for (const value of percentages) {
    if (!Number.isInteger(value) || value < 1 || value > 100) return err('THRESHOLD_INVALID');
  }
  if (new Set(percentages).size !== percentages.length) return err('THRESHOLD_DUPLICATE');
  if (percentages.includes(AUTOMATIC_THRESHOLD_PERCENTAGE)) return err('THRESHOLD_AUTOMATIC');

  return ok([...percentages].sort((a, b) => a - b));
}

// Text typed in the form -> whole number. Anything else (empty, decimals, letters) is invalid.
export function parseThresholdText(text: string): Result<number, 'THRESHOLD_INVALID'> {
  const trimmed = text.trim();
  return /^\d{1,3}$/.test(trimmed) ? ok(Number(trimmed)) : err('THRESHOLD_INVALID');
}

// Has the usage reached the threshold? Compared with whole numbers (spent * 100 >= threshold *
// available), because 90% of 55 written as a decimal could come out as 89.99999.
export function hasReachedThreshold(
  spentMinor: number,
  availableMinor: number,
  percentage: number,
): boolean {
  return BigInt(spentMinor) * 100n >= BigInt(percentage) * BigInt(availableMinor);
}

type EvaluationInput = {
  spentMinor: number;
  availableMinor: number;
  notifies: boolean; // RN-30
  thresholds: readonly Threshold[]; // configurable + the automatic 100%
  sentThresholdIds: ReadonlySet<string>; // alerts already sent (RN-27)
};

// What to do after a change that may have moved the usage (RN-26 decides when this runs):
// - RN-27: each threshold notifies once; if the usage falls under it, its record is cleared so it
//   can notify again.
// - RN-28: if one change crosses several thresholds, all are recorded but only the highest notifies.
// - RN-29: above 100% nothing new is sent (the 100% was already recorded); the screen shows "exceeded".
// - RN-30: closed and deleted budgets do nothing.
export function evaluateThresholds(input: EvaluationInput): EvaluationDecision {
  if (!input.notifies) return { toRecord: [], toClear: [], alertThreshold: null };

  const reached = (threshold: Threshold) =>
    hasReachedThreshold(input.spentMinor, input.availableMinor, threshold.percentage);

  const toClear = input.thresholds
    .filter((threshold) => input.sentThresholdIds.has(threshold.id) && !reached(threshold))
    .map((threshold) => threshold.id);
  const crossed = input.thresholds.filter(
    (threshold) => reached(threshold) && !input.sentThresholdIds.has(threshold.id),
  );
  const alertThreshold = crossed.reduce<Threshold | null>(
    (highest, threshold) =>
      highest === null || threshold.percentage > highest.percentage ? threshold : highest,
    null,
  );

  return { toRecord: crossed.map((threshold) => threshold.id), toClear, alertThreshold };
}
