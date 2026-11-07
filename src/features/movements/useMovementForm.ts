import { zodResolver } from '@hookform/resolvers/zod';
import { parse } from 'date-fns';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';

import { formatMinorToText, parseAmountToMinor } from '@/core/shared/amount';
import { toOccurredAt, todayLocalDate } from '@/core/shared/dates';
import { UNCLASSIFIED_CODE } from '@/core/shared/system-categories';

import type { Category } from '../categories/category.types';
import {
  checkMovementEditable,
  describeLineAssignment,
  remainingMinor,
  validateMovement,
} from './movement.rules';
import type { LineAssignment } from './movement.rules';
import { movementFormSchema } from './movement.schemas';
import type { MovementFormValues } from './movement.schemas';
import type { AssignableBudget, Movement } from './movement.types';
import { useMovementRepository } from './useMovementRepository';

type Options = {
  categories: readonly Category[]; // all known categories (the screen reads them)
  movementId?: string; // set when editing
  onSaved: () => void;
};

function currentTime(now: Date): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// Create / edit / delete a movement with its lines (RN-12 to RN-21). It lives here so the
// screen only paints and sends events.
export function useMovementForm({ categories, movementId, onSaved }: Options) {
  const repository = useMovementRepository();
  const isEditing = movementId !== undefined;
  const [today] = useState(() => todayLocalDate());
  const [budgets, setBudgets] = useState<readonly AssignableBudget[]>([]);
  const [movement, setMovement] = useState<Movement | null>(null);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [failure, setFailure] = useState<string | null>(null);

  // RN-14 / RN-40: a line without a chosen category falls in SIN_CLASIFICAR.
  const unclassifiedId =
    categories.find((category) => category.isSystem && category.code === UNCLASSIFIED_CODE)?.id ??
    '';

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementFormSchema),
    defaultValues: {
      kind: 'EXPENSE',
      currency: 'COP',
      total: '',
      date: today,
      time: currentTime(new Date()),
      paymentMethod: 'CASH',
      note: '',
      lines: [{ categoryId: unclassifiedId, amount: '' }],
    },
  });
  const { reset, setValue, getValues, control } = form;
  const lines = useFieldArray({ control, name: 'lines' });

  // Budgets are read once: they only feed the "Counts for" preview and the closed-budget lock.
  useEffect(() => {
    let active = true;
    void repository.listBudgets().then((list) => {
      if (active) setBudgets(list);
    });

    return () => {
      active = false;
    };
  }, [repository]);

  useEffect(() => {
    if (movementId === undefined) return;
    let active = true;
    void repository.get(movementId).then((found) => {
      if (!active) return;
      setMovement(found && found.deletedAt === null ? found : null);
      setIsLoading(false);
      if (found && found.deletedAt === null) {
        reset({
          kind: found.kind,
          currency: found.currency,
          total: formatMinorToText(found.totalMinor, found.currency),
          date: found.localDate,
          time: found.occurredAt.slice(11, 16),
          paymentMethod: found.paymentMethod,
          note: found.note ?? '',
          lines: found.lines.map((line) => ({
            categoryId: line.categoryId,
            amount: formatMinorToText(line.amountMinor, found.currency),
          })),
        });
      }
    });

    return () => {
      active = false;
    };
  }, [repository, movementId, reset]);

  const watched = useWatch({ control });
  const currency = watched.currency ?? 'COP';
  const lineValues = watched.lines ?? [];

  const toMinor = (text: string | undefined) => {
    const parsed = parseAmountToMinor(text ?? '', currency);
    return parsed.ok ? parsed.value : 0;
  };
  const totalMinor = toMinor(watched.total);
  // What is still to be shared out. With one empty line, that line takes the whole total (below).
  const remaining = remainingMinor(
    totalMinor,
    lineValues.map((line) => toMinor(line?.amount)),
  );

  // RN-17 / RN-18 / RN-41: where each line would count, shown before saving.
  const assignments: LineAssignment[] = lineValues.map((line) =>
    describeLineAssignment(
      { categoryId: line?.categoryId ?? '', currency, localDate: watched.date ?? today },
      budgets,
      today,
    ),
  );

  // RN-08 / RN-18: editing or deleting is blocked if a line counts in a closed budget.
  const isLocked = movement ? !checkMovementEditable(movement, budgets, today).ok : false;

  function addLine() {
    lines.append({
      categoryId: unclassifiedId,
      amount: remaining > 0 ? formatMinorToText(remaining, currency) : '',
    });
  }

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      if (isEditing && (!movement || isLocked)) return setFailure('MOVEMENT_LOCKED');

      const occurred = parse(`${values.date} ${values.time}`, 'yyyy-MM-dd HH:mm', new Date());
      const input = {
        kind: values.kind,
        currency: values.currency,
        totalMinor: toMinor(values.total),
        occurredAt: toOccurredAt(occurred),
        paymentMethod: values.paymentMethod,
        note: values.note.trim() === '' ? null : values.note.trim(),
        lines: values.lines.map((line) => ({
          categoryId: line.categoryId,
          amountMinor: toMinor(line.amount),
        })),
      };

      const valid = validateMovement(input, new Date(), categories);
      if (!valid.ok) return setFailure(valid.error);

      if (movementId === undefined) await repository.create(valid.value);
      else await repository.update(movementId, valid.value);
      onSaved();
    } catch {
      setFailure('UNEXPECTED');
    }
  });

  // One empty line takes the whole total, so a simple purchase needs no extra typing.
  function submitForm() {
    const current = getValues();
    const only = current.lines.length === 1 ? current.lines[0] : undefined;
    if (only && only.amount.trim() === '') setValue('lines.0.amount', current.total);

    return submit();
  }

  // RN-21: logical delete, blocked when it would touch a closed budget (RN-08).
  async function remove() {
    if (!movementId || !movement) return;
    if (isLocked) return setFailure('MOVEMENT_LOCKED');
    try {
      await repository.softDelete(movementId);
      onSaved();
    } catch {
      setFailure('UNEXPECTED');
    }
  }

  return {
    form,
    lines,
    addLine,
    submit: submitForm,
    remove,
    failure,
    isEditing,
    isLoading,
    isLocked,
    movement,
    assignments,
    remainingMinor: remaining,
    hasClosedBudgetWarning: assignments.some((assignment) => assignment.kind === 'CLOSED_BUDGET'),
    budgets,
  };
}
