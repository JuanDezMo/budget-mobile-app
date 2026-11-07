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
  describeIncomeImpact,
  describeLineAssignment,
  remainingMinor,
  validateMovement,
} from './movement.rules';
import type { IncomeImpact, LineAssignment } from './movement.rules';
import { movementFormSchema } from './movement.schemas';
import type { MovementFormValues } from './movement.schemas';
import type { AssignableBudget, BudgetUsageSnapshot, Movement } from './movement.types';
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
  const [budgetUsage, setBudgetUsage] = useState<Readonly<Record<string, BudgetUsageSnapshot>>>({});
  const [movement, setMovement] = useState<Movement | null>(null);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [failure, setFailure] = useState<string | null>(null);
  // Sketch 4, "Is it for an envelope?": an income can be general (a salary: no envelope gets
  // more money, RN-41) or for an envelope (it adds to its available amount, RN-23).
  const [forEnvelope, setForEnvelope] = useState(false);

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

  // Budgets and what they hold are read once: they feed the "Counts for" preview, the closed-budget
  // lock and the income note.
  useEffect(() => {
    let active = true;
    void Promise.all([repository.listBudgets(), repository.listBudgetUsage()]).then(
      ([list, usage]) => {
        if (!active) return;
        setBudgets(list);
        setBudgetUsage(usage);
      },
    );

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
        // An income saved on a real category was "for an envelope".
        setForEnvelope(
          found.kind === 'INCOME' && found.lines.some((line) => line.categoryId !== unclassifiedId),
        );
      }
    });

    return () => {
      active = false;
    };
  }, [repository, movementId, reset, unclassifiedId]);

  // The categories arrive after the form is created, so a new line cannot know SIN_CLASIFICAR yet:
  // once it is known, lines still without a category take it (RN-14, RN-40).
  useEffect(() => {
    if (isEditing || unclassifiedId === '') return;
    getValues('lines').forEach((line, index) => {
      if (line.categoryId === '') setValue(`lines.${index}.categoryId`, unclassifiedId);
    });
  }, [isEditing, unclassifiedId, getValues, setValue]);

  const watched = useWatchedForm(control);
  const currency = watched.currency ?? 'COP';
  const kind = watched.kind ?? 'EXPENSE';
  const lineValues = watched.lines ?? [];
  // A general income has no lines to show: it is one line in SIN_CLASIFICAR.
  const showsLines = kind !== 'INCOME' || forEnvelope;

  const toMinor = (text: string | undefined) => {
    const parsed = parseAmountToMinor(text ?? '', currency);
    return parsed.ok ? parsed.value : 0;
  };
  const totalMinor = toMinor(watched.total);
  // One empty line takes the whole total (that is what saving does), so the preview treats it so.
  const onlyLineIsEmpty = lineValues.length === 1 && (lineValues[0]?.amount ?? '').trim() === '';
  const lineAmounts = lineValues.map((line) =>
    onlyLineIsEmpty ? totalMinor : toMinor(line?.amount),
  );
  // What is still to be shared out.
  const remaining = remainingMinor(totalMinor, lineAmounts);

  // RN-17 / RN-18 / RN-41: where each line would count, shown before saving.
  const assignments: LineAssignment[] = lineValues.map((line) =>
    describeLineAssignment(
      {
        categoryId: showsLines ? (line?.categoryId ?? '') : unclassifiedId,
        currency,
        localDate: watched.date ?? today,
      },
      budgets,
      today,
    ),
  );

  // Sketch 4: what an income does to the envelope it counts for (RN-23).
  const incomeImpact = describeIncome({
    kind,
    forEnvelope,
    assignments,
    lineAmounts,
    budgetUsage,
    movement,
  });

  // RN-08 / RN-18: editing or deleting is blocked if a line counts in a closed budget.
  const isLocked = movement ? !checkMovementEditable(movement, budgets, today).ok : false;

  function addLine() {
    lines.append({
      categoryId: unclassifiedId,
      amount: remaining > 0 ? formatMinorToText(remaining, currency) : '',
    });
  }

  function changeForEnvelope(value: boolean) {
    setForEnvelope(value);
    if (!value) {
      // Back to a general income: one line in SIN_CLASIFICAR that takes the whole total.
      lines.replace([{ categoryId: unclassifiedId, amount: '' }]);
    }
  }

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      if (isEditing && (!movement || isLocked)) return setFailure('MOVEMENT_LOCKED');

      const occurred = parse(`${values.date} ${values.time}`, 'yyyy-MM-dd HH:mm', new Date());
      const total = toMinor(values.total);
      const input = {
        kind: values.kind,
        currency: values.currency,
        totalMinor: total,
        occurredAt: toOccurredAt(occurred),
        paymentMethod: values.paymentMethod,
        note: values.note.trim() === '' ? null : values.note.trim(),
        // A general income is one line, in SIN_CLASIFICAR (RN-41: it adds to no envelope).
        lines: showsLines
          ? values.lines.map((line) => ({
              categoryId: line.categoryId,
              amountMinor: toMinor(line.amount),
            }))
          : [{ categoryId: unclassifiedId, amountMinor: total }],
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
    today,
    showsLines,
    // With one empty line, the field suggests the total it will take when saving.
    singleLinePlaceholder:
      onlyLineIsEmpty && totalMinor > 0 ? formatMinorToText(totalMinor, currency) : '0',
    forEnvelope,
    changeForEnvelope,
    incomeImpact,
  };
}

// What the form is showing right now, to react to it (kind, currency, amounts...).
function useWatchedForm(control: ReturnType<typeof useForm<MovementFormValues>>['control']) {
  return useWatch({ control });
}

// The income note of sketch 4. Only for an income that counts for an envelope.
function describeIncome(input: {
  kind: string;
  forEnvelope: boolean;
  assignments: readonly LineAssignment[];
  lineAmounts: readonly number[];
  budgetUsage: Readonly<Record<string, BudgetUsageSnapshot>>;
  movement: Movement | null;
}): IncomeImpact | null {
  if (input.kind !== 'INCOME' || !input.forEnvelope) return null;

  const index = input.assignments.findIndex((assignment) => assignment.kind === 'BUDGET');
  const assignment = input.assignments[index];
  if (!assignment || assignment.kind !== 'BUDGET') return null;
  const usage = input.budgetUsage[assignment.budget.id];
  if (!usage) return null;

  // Editing: this income's own previous lines are already inside the budget's totals.
  const previous =
    input.movement?.kind === 'INCOME'
      ? input.movement.lines
          .filter((line) => line.budgetId === assignment.budget.id)
          .reduce((sum, line) => sum + line.amountMinor, 0)
      : 0;

  return describeIncomeImpact(input.lineAmounts[index] ?? 0, usage, previous);
}
