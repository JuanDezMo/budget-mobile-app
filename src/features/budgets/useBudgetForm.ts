import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { formatMinorToText, parseAmountToMinor } from '@/core/shared/amount';
import type { CurrencyCode } from '@/core/shared/currency';
import { addDaysToLocalDate, todayLocalDate } from '@/core/shared/dates';
import type { LocalDate } from '@/core/shared/dates';

import { checkCanHaveBudget } from '../categories/category.rules';
import type { Category } from '../categories/category.types';
import {
  checkCanEditBudget,
  checkCurrencyUnchanged,
  checkNewBudgetData,
  checkNoOverlap,
  isAmountBelowSpent,
} from './budget.rules';
import { budgetFormSchema } from './budget.schemas';
import type { BudgetFormValues } from './budget.schemas';
import type { Budget } from './budget.types';
import { useBudgetRepository } from './useBudgetRepository';

// What the envelope preview at the top of the form draws, live while the user fills the form.
export type BudgetPreview = {
  category: Category | undefined; // undefined until one is chosen
  currency: CurrencyCode;
  amountMinor: number; // 0 while the amount is empty or not valid yet
  startDate: LocalDate;
  endDate: LocalDate;
};

const DEFAULT_LENGTH_DAYS = 14;

type Options = {
  // Categories to choose from, given by the screen (it reads them from the categories feature).
  categories: readonly Category[];
  // Set when editing an existing budget.
  budgetId?: string;
  // Called after the budget is saved, with its id (the thresholds are saved right after).
  onSaved: (budgetId: string) => void | Promise<void>;
};

// Create / edit form (RN-01 to RN-03, RN-06, RN-07). It lives here so the screen only paints.
export function useBudgetForm({ categories, budgetId, onSaved }: Options) {
  const repository = useBudgetRepository();
  const [today] = useState(() => todayLocalDate());
  const [budget, setBudget] = useState<Budget | null>(null);
  const [isLoading, setIsLoading] = useState(budgetId !== undefined);
  const [failure, setFailure] = useState<string | null>(null);
  // RN-06: set when the new amount is under what is already spent; a second tap confirms.
  const [lowAmount, setLowAmount] = useState<{ spentMinor: number; amountMinor: number } | null>(
    null,
  );

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      categoryId: '',
      currency: 'COP',
      amount: '',
      startDate: today,
      endDate: addDaysToLocalDate(today, DEFAULT_LENGTH_DAYS),
    },
  });
  const { reset, control } = form;
  const watched = useWatch({ control });

  useEffect(() => {
    if (budgetId === undefined) return;
    let active = true;
    void repository.get(budgetId).then((found) => {
      if (!active) return;
      setBudget(found);
      setIsLoading(false);
      if (found) {
        reset({
          categoryId: found.categoryId,
          currency: found.currency,
          amount: formatMinorToText(found.amountMinor, found.currency),
          startDate: found.startDate,
          endDate: found.endDate,
        });
      }
    });

    return () => {
      active = false;
    };
  }, [repository, budgetId, reset]);

  const isEditing = budgetId !== undefined;
  // RN-06 / RN-07 / RN-08: an edit is only possible while the budget is ACTIVE.
  const isEditable = !isEditing || (budget !== null && checkCanEditBudget(budget, today).ok);
  // RN-36 / RN-40: only categories that can have a budget are offered when creating.
  const categoryOptions = categories.filter((category) => checkCanHaveBudget(category).ok);

  const currency = watched.currency ?? 'COP';
  const parsedAmount = parseAmountToMinor(watched.amount ?? '', currency);
  const preview: BudgetPreview = {
    category: categories.find((candidate) => candidate.id === watched.categoryId),
    currency,
    amountMinor: parsedAmount.ok ? parsedAmount.value : 0,
    startDate: watched.startDate ?? today,
    endDate: watched.endDate ?? today,
  };

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    const parsed = parseAmountToMinor(values.amount, values.currency);
    if (!parsed.ok) return;
    const amountMinor = parsed.value;

    let savedId = '';
    try {
      const sameCategory = await repository.list({ categoryId: values.categoryId });
      const dates = { startDate: values.startDate, endDate: values.endDate };

      if (isEditing) {
        if (!budget) return;
        const editable = checkCanEditBudget(budget, today);
        if (!editable.ok) return setFailure(editable.error);
        const locked = checkCurrencyUnchanged(budget, values.currency);
        if (!locked.ok) return setFailure(locked.error);
        const free = checkNoOverlap(
          { categoryId: budget.categoryId, ...dates },
          sameCategory,
          budget.id,
        );
        if (!free.ok) return form.setError('startDate', { message: free.error });

        const spentMinor = await repository.getSpentMinor(budget.id);
        if (isAmountBelowSpent(amountMinor, spentMinor) && lowAmount?.amountMinor !== amountMinor) {
          setLowAmount({ amountMinor, spentMinor });
          return;
        }
        const saved = await repository.update(budget.id, { amountMinor, ...dates });
        if (!saved.ok) return form.setError('startDate', { message: saved.error });
        savedId = budget.id;
      } else {
        const category = categories.find((candidate) => candidate.id === values.categoryId);
        if (!category) return form.setError('categoryId', { message: 'BUDGET_CATEGORY_REQUIRED' });

        const data = {
          categoryId: values.categoryId,
          currency: values.currency,
          amountMinor,
          ...dates,
        };
        const valid = checkNewBudgetData(data, category);
        if (!valid.ok) return setFailure(valid.error);
        const free = checkNoOverlap(data, sameCategory);
        if (!free.ok) return form.setError('startDate', { message: free.error });

        const saved = await repository.create(data);
        if (!saved.ok) return form.setError('startDate', { message: saved.error });
        savedId = saved.value.id;
      }

      await onSaved(savedId);
    } catch {
      setFailure('UNEXPECTED');
    }
  });

  return {
    form,
    submit,
    failure,
    lowAmount,
    isEditing,
    isEditable,
    isLoading,
    budget,
    categoryOptions,
    preview,
  };
}
