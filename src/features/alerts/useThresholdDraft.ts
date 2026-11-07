import { useEffect, useState } from 'react';

import { err, ok } from '@/core/shared/result';
import type { Result } from '@/core/shared/result';

import { parseThresholdText, validateConfigurableThresholds } from './alert.rules';
import type { ThresholdError } from './alert.rules';
import { MAX_CONFIGURABLE_THRESHOLDS } from './alert.types';
import { useAlertActions, useThresholdRepository } from './useAlertDependencies';

export type ThresholdSaveError = ThresholdError | 'UNEXPECTED';

// The thresholds being edited in the budget form (RN-24, RN-25). Texts are what the user typed;
// an empty box is simply not used. Nothing is saved until `save` is called with the budget id,
// which the form knows only after the budget itself was saved.
export function useThresholdDraft({ budgetId }: { budgetId?: string }) {
  const repository = useThresholdRepository();
  const actions = useAlertActions();
  const [texts, setTexts] = useState<string[]>([]);

  // Editing: show the thresholds the budget already has.
  useEffect(() => {
    if (budgetId === undefined) return;
    let active = true;
    void repository.list(budgetId).then((thresholds) => {
      if (active) {
        setTexts(thresholds.filter((t) => !t.isAutomatic).map((t) => String(t.percentage)));
      }
    });

    return () => {
      active = false;
    };
  }, [repository, budgetId]);

  // Parse what was typed (ignoring empty boxes) and check RN-24.
  const filled = texts.filter((text) => text.trim() !== '');
  const parsed = filled.map(parseThresholdText);
  const firstInvalid = parsed.find((result) => !result.ok);
  const validation: Result<number[], ThresholdSaveError> = firstInvalid
    ? err('THRESHOLD_INVALID')
    : validateConfigurableThresholds(parsed.flatMap((result) => (result.ok ? [result.value] : [])));

  async function save(savedBudgetId: string): Promise<Result<void, ThresholdSaveError>> {
    if (!validation.ok) return validation;
    try {
      await repository.ensureAutomatic(savedBudgetId); // RN-25
      await repository.replaceConfigurable(savedBudgetId, validation.value);
      await actions.syncAfterThresholdEdit(savedBudgetId);

      return ok(undefined);
    } catch {
      return err('UNEXPECTED');
    }
  }

  return {
    texts,
    canAdd: texts.length < MAX_CONFIGURABLE_THRESHOLDS,
    add: () => setTexts((current) => [...current, '']),
    remove: (index: number) => setTexts((current) => current.filter((_, i) => i !== index)),
    setText: (index: number, text: string) =>
      setTexts((current) => current.map((value, i) => (i === index ? text : value))),
    isValid: validation.ok,
    error: validation.ok ? null : validation.error,
    save,
  };
}

export type ThresholdDraft = ReturnType<typeof useThresholdDraft>;
