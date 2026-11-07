import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';
import type { AlertButton } from 'react-native';

import { SEED_SYSTEM_CATEGORIES } from '@/core/db/seed-data';
import { initI18n, setAppLanguage } from '@/core/i18n/i18n';
import { addDaysToLocalDate, todayLocalDate } from '@/core/shared/dates';
import { ThemeProvider } from '@/core/theme/ThemeProvider';
import { mockDatePicker } from '@/test-support/date-picker';
import { createInMemoryBudgetRepository } from '@/features/budgets/budget.repository';
import type { BudgetRepository } from '@/features/budgets/budget.repository';
import type { Budget } from '@/features/budgets/budget.types';
import { BudgetDetail } from '@/features/budgets/components/BudgetDetail';
import { BudgetForm } from '@/features/budgets/components/BudgetForm';
import { BudgetList } from '@/features/budgets/components/BudgetList';
import { BudgetRepositoryProvider } from '@/features/budgets/useBudgetRepository';
import type { Category } from '@/features/categories/category.types';

// The system date picker is native: in tests each press "picks" the date set in `mockPickedDate`.
let mockPickedDate = new Date(2026, 10, 1);
jest.mock('@react-native-community/datetimepicker', () => mockDatePicker(() => mockPickedDate));

// Screen tests live here, not in src/app, because Expo Router treats every file there as a route.
const categories: Category[] = SEED_SYSTEM_CATEGORIES.map((c) => ({
  id: c.id,
  isSystem: true,
  code: c.code,
  icon: c.icon,
  color: c.color,
  archivedAt: null,
}));
const ENTRETENIMIENTO = SEED_SYSTEM_CATEGORIES[2]?.id ?? '';
const today = todayLocalDate();

function budgetEndingIn(
  id: string,
  daysFromToday: number,
  overrides: Partial<Budget> = {},
): Budget {
  const endDate = addDaysToLocalDate(today, daysFromToday);
  return {
    id,
    categoryId: ENTRETENIMIENTO,
    currency: 'USD',
    amountMinor: 5500,
    startDate: addDaysToLocalDate(endDate, -9),
    endDate,
    status: 'ACTIVE',
    spentFinalMinor: null,
    closedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

let repository: BudgetRepository;

function Providers({ children }: { children: ReactNode }) {
  return (
    <BudgetRepositoryProvider value={repository}>
      <ThemeProvider mode="LIGHT">{children}</ThemeProvider>
    </BudgetRepositoryProvider>
  );
}

function makeRepository(budgets: Budget[] = [], spent: Record<string, number> = {}) {
  let n = 0;
  repository = createInMemoryBudgetRepository(budgets, () => `new-${(n += 1)}`, spent);
}

async function pickDate(label: string, date: Date) {
  mockPickedDate = date;
  await fireEvent.press(screen.getByLabelText(label));
}

beforeEach(async () => {
  makeRepository();
  await initI18n('es');
  await setAppLanguage('es');
  jest.restoreAllMocks();
});

describe('budget form', () => {
  async function fillEntertainment() {
    await fireEvent.press(screen.getByRole('radio', { name: 'Entretenimiento' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'USD' }));
    await fireEvent.changeText(screen.getByLabelText('Monto'), '55');
    await pickDate('Fecha de inicio', new Date(2026, 10, 1));
    await pickDate('Fecha de fin', new Date(2026, 10, 15));
  }

  it('RN-01 creates "Entretenimiento USD 55, 1–15 nov"', async () => {
    let saved = false;
    await render(<BudgetForm categories={categories} onSaved={() => (saved = true)} />, {
      wrapper: Providers,
    });

    await fillEntertainment();
    await fireEvent.press(screen.getByRole('button', { name: 'Crear presupuesto' }));

    await waitFor(() => expect(saved).toBe(true));
    expect(await repository.list()).toEqual([
      expect.objectContaining({
        categoryId: ENTRETENIMIENTO,
        currency: 'USD',
        amountMinor: 5500,
        startDate: '2026-11-01',
        endDate: '2026-11-15',
      }),
    ]);
  });

  it('RN-03 rejects a second budget that overlaps, with a clear message', async () => {
    makeRepository([
      { ...budgetEndingIn('first', 0), startDate: '2026-11-01', endDate: '2026-11-15' },
    ]);
    let saved = false;
    await render(<BudgetForm categories={categories} onSaved={() => (saved = true)} />, {
      wrapper: Providers,
    });

    await fireEvent.press(screen.getByRole('radio', { name: 'Entretenimiento' }));
    await fireEvent.changeText(screen.getByLabelText('Monto'), '20');
    await pickDate('Fecha de inicio', new Date(2026, 10, 10));
    await pickDate('Fecha de fin', new Date(2026, 10, 30));
    await fireEvent.press(screen.getByRole('button', { name: 'Crear presupuesto' }));

    expect(
      await screen.findByText(
        'Esta categoría ya tiene un presupuesto que se cruza con esas fechas.',
      ),
    ).toBeTruthy();
    expect(saved).toBe(false);
    expect(await repository.list()).toHaveLength(1);
  });

  it('RN-01 asks for a category, a valid amount and ordered dates', async () => {
    await render(<BudgetForm categories={categories} onSaved={() => undefined} />, {
      wrapper: Providers,
    });

    await fireEvent.changeText(screen.getByLabelText('Monto'), '0');
    await pickDate('Fecha de inicio', new Date(2026, 10, 20));
    await pickDate('Fecha de fin', new Date(2026, 10, 5));
    await fireEvent.press(screen.getByRole('button', { name: 'Crear presupuesto' }));

    expect(await screen.findByText('Elige una categoría.')).toBeTruthy();
    expect(screen.getByText('El monto debe ser mayor que 0.')).toBeTruthy();
    expect(screen.getByText('La fecha de inicio no puede ser posterior a la de fin.')).toBeTruthy();
  });

  it('RN-40 / RN-36 does not offer SIN_CLASIFICAR or archived categories', async () => {
    const archived: Category = {
      id: 'old',
      isSystem: false,
      name: 'Vieja',
      icon: 'star',
      color: '#5C6570',
      archivedAt: '2026-10-01T00:00:00Z',
    };
    await render(<BudgetForm categories={[...categories, archived]} onSaved={() => undefined} />, {
      wrapper: Providers,
    });

    expect(screen.getByRole('radio', { name: 'Transporte' })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: 'Sin clasificar' })).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Vieja' })).toBeNull();
  });

  it('RN-06 edits the amount of an active budget', async () => {
    makeRepository([budgetEndingIn('b1', 5)]);
    let saved = false;
    await render(
      <BudgetForm categories={categories} budgetId="b1" onSaved={() => (saved = true)} />,
      { wrapper: Providers },
    );

    const amount = await screen.findByLabelText('Monto');
    expect(amount.props.value).toBe('55.00');
    await fireEvent.changeText(amount, '80');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(saved).toBe(true));
    expect((await repository.get('b1'))?.amountMinor).toBe(8000);
  });

  it('RN-02 the currency cannot be changed when editing', async () => {
    makeRepository([budgetEndingIn('b1', 5)]);
    await render(<BudgetForm categories={categories} budgetId="b1" onSaved={() => undefined} />, {
      wrapper: Providers,
    });

    await screen.findByLabelText('Monto');

    expect(screen.getByRole('radio', { name: 'EUR' })).toBeDisabled();
    expect(screen.getByText('La moneda no se puede cambiar.')).toBeTruthy();
  });

  it('RN-06 warns when the new amount is under what was spent, and saves on the second tap', async () => {
    makeRepository([budgetEndingIn('b1', 5)], { b1: 4000 });
    let saved = false;
    await render(
      <BudgetForm categories={categories} budgetId="b1" onSaved={() => (saved = true)} />,
      { wrapper: Providers },
    );

    await fireEvent.changeText(await screen.findByLabelText('Monto'), '30');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText(/menor que lo que ya gastaste \(USD\s40,00\)/)).toBeTruthy();
    expect(saved).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar de todos modos' }));
    await waitFor(() => expect(saved).toBe(true));
    expect((await repository.get('b1'))?.amountMinor).toBe(3000);
  });

  it('RN-07 / RN-08 a budget in grace or closed is read-only', async () => {
    makeRepository([budgetEndingIn('grace', -2)]);
    await render(
      <BudgetForm categories={categories} budgetId="grace" onSaved={() => undefined} />,
      { wrapper: Providers },
    );

    expect(
      await screen.findByText('Un presupuesto solo se puede editar mientras está activo.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });
});

describe('budget list', () => {
  it('RN-05 shows budgets under active, grace and closed', async () => {
    makeRepository([budgetEndingIn('a', 5), budgetEndingIn('g', -3), budgetEndingIn('c', -30)]);
    await render(
      <BudgetList categories={categories} onCreate={() => undefined} onOpen={() => undefined} />,
      { wrapper: Providers },
    );

    expect(await screen.findByText('Activos')).toBeTruthy();
    expect(screen.getByText('En periodo de gracia')).toBeTruthy();
    expect(screen.getByText('Cerrados')).toBeTruthy();
    expect(screen.getAllByText('Entretenimiento')).toHaveLength(3);
  });

  it('shows a message when there are no budgets, and opens one when pressed', async () => {
    let opened = '';
    makeRepository([budgetEndingIn('a', 5)]);
    await render(
      <BudgetList
        categories={categories}
        onCreate={() => undefined}
        onOpen={(id) => (opened = id)}
      />,
      { wrapper: Providers },
    );

    await fireEvent.press(await screen.findByRole('button', { name: /Entretenimiento/ }));

    expect(opened).toBe('a');
  });

  it('shows the empty message with no budgets', async () => {
    await render(
      <BudgetList categories={categories} onCreate={() => undefined} onOpen={() => undefined} />,
      { wrapper: Providers },
    );

    expect(await screen.findByText('Aún no tienes presupuestos.')).toBeTruthy();
  });
});

describe('budget detail', () => {
  it('shows the budget data and lets an active budget be edited', async () => {
    makeRepository([budgetEndingIn('b1', 5)]);
    await render(
      <BudgetDetail
        budgetId="b1"
        categories={categories}
        onEdit={() => undefined}
        onDeleted={() => undefined}
      />,
      { wrapper: Providers },
    );

    expect(await screen.findByText('Entretenimiento')).toBeTruthy();
    expect(screen.getByText('Activo')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeTruthy();
  });

  it('RN-08 a closed budget cannot be edited', async () => {
    makeRepository([budgetEndingIn('b1', -30)]);
    await render(
      <BudgetDetail
        budgetId="b1"
        categories={categories}
        onEdit={() => undefined}
        onDeleted={() => undefined}
      />,
      { wrapper: Providers },
    );

    expect(await screen.findByText('Cerrado')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
  });

  it('RN-10 deleting asks first, then removes the budget from the lists', async () => {
    makeRepository([budgetEndingIn('b1', 5)]);
    let deleted = false;
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await render(
      <BudgetDetail
        budgetId="b1"
        categories={categories}
        onEdit={() => undefined}
        onDeleted={() => (deleted = true)}
      />,
      { wrapper: Providers },
    );

    await fireEvent.press(await screen.findByRole('button', { name: 'Borrar' }));

    expect(alert).toHaveBeenCalledWith(
      '¿Borrar este presupuesto?',
      expect.any(String),
      expect.any(Array),
    );
    expect((await repository.list()).length).toBe(1);

    const buttons = alert.mock.calls[0]?.[2] as AlertButton[];
    buttons.find((button) => button.style === 'destructive')?.onPress?.();

    await waitFor(() => expect(deleted).toBe(true));
    expect(await repository.list()).toEqual([]);
    expect(await repository.list({ includeDeleted: true })).toHaveLength(1);
  });
});
