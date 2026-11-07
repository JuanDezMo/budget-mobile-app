import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import type { AlertButton } from 'react-native';

import { SEED_SYSTEM_CATEGORIES } from '@/core/db/seed-data';
import { initI18n, setAppLanguage } from '@/core/i18n/i18n';
import { addDaysToLocalDate, todayLocalDate } from '@/core/shared/dates';
import { ThemeProvider } from '@/core/theme/ThemeProvider';
import { mockDatePicker } from '@/test-support/date-picker'; // before the components that use the picker
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import type { Category } from '@/features/categories/category.types';
import { MovementForm } from '@/features/movements/components/MovementForm';
import { MovementList } from '@/features/movements/components/MovementList';
import { createInMemoryMovementRepository } from '@/features/movements/movement.repository';
import type { MovementRepository } from '@/features/movements/movement.repository';
import { budgetAssignmentRules } from '@/features/movements/movement.rules';
import type {
  AssignableBudget,
  BudgetUsageSnapshot,
  Movement,
} from '@/features/movements/movement.types';
import { MovementRepositoryProvider } from '@/features/movements/useMovementRepository';

let mockPickedDate = new Date();
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
const FOOD = SEED_SYSTEM_CATEGORIES[0]?.id ?? '';
const FUN = SEED_SYSTEM_CATEGORIES[2]?.id ?? '';
const HOME = SEED_SYSTEM_CATEGORIES[4]?.id ?? '';
const today = todayLocalDate();
const day = (offset: number) => addDaysToLocalDate(today, offset);

const budget = (
  id: string,
  categoryId: string,
  start: number,
  end: number,
  status: 'ACTIVE' | 'CLOSED' = 'ACTIVE',
): AssignableBudget => ({
  id,
  categoryId,
  currency: 'USD',
  startDate: day(start),
  endDate: day(end),
  status,
  deletedAt: null,
});

let repository: MovementRepository;
let budgets: AssignableBudget[];

function Providers({ children }: { children: ReactNode }) {
  return (
    <MovementRepositoryProvider value={repository}>
      <ThemeProvider mode="LIGHT">{children}</ThemeProvider>
    </MovementRepositoryProvider>
  );
}

function setup(
  initial: Movement[] = [],
  activeBudgets: AssignableBudget[] = [],
  usageById: Record<string, BudgetUsageSnapshot> = {},
) {
  let n = 0;
  budgets = activeBudgets;
  repository = createInMemoryMovementRepository(
    () => budgets,
    () => `id-${(n += 1)}`,
    budgetAssignmentRules,
    initial,
    usageById,
  );
}

const movement = (id: string, overrides: Partial<Movement> = {}): Movement => ({
  id,
  kind: 'EXPENSE',
  currency: 'USD',
  totalMinor: 4000,
  occurredAt: `${day(-1)}T10:00:00-05:00`,
  localDate: day(-1),
  paymentMethod: 'CASH',
  note: null,
  lines: [{ id: `${id}-l1`, categoryId: FUN, budgetId: null, amountMinor: 4000 }],
  deletedAt: null,
  ...overrides,
});

async function chooseCategory(line: number, label: string) {
  await fireEvent.press(screen.getByRole('button', { name: `Elegir categoría ${line}` }));
  await fireEvent.press(screen.getByRole('radio', { name: `Categoría ${line}: ${label}` }));
}

async function chooseCurrency(code: string) {
  await fireEvent.press(screen.getByRole('button', { name: /^Moneda: / }));
  await fireEvent.press(screen.getByRole('radio', { name: code }));
}

async function addLine() {
  await fireEvent.press(screen.getByRole('button', { name: 'Dividir en otra categoría' }));
}

beforeEach(async () => {
  setup();
  mockPickedDate = new Date();
  await initI18n('es');
  await setAppLanguage('es');
  jest.restoreAllMocks();
});

describe('movement form', () => {
  it('RN-14 / RN-17 saves a USD 100 market split in 3 categories and shows where each line counts', async () => {
    setup([], [budget('b-food', FOOD, -5, 5), budget('b-fun', FUN, -5, 5)]);
    let saved = false;
    await render(<MovementForm categories={categories} onSaved={() => (saved = true)} />, {
      wrapper: Providers,
    });

    await chooseCurrency('USD');
    await fireEvent.changeText(screen.getByLabelText('Monto total'), '100');
    await chooseCategory(1, 'Alimentación');
    await fireEvent.changeText(screen.getByLabelText('Monto 1'), '50');
    await addLine();
    await chooseCategory(2, 'Entretenimiento');
    await fireEvent.changeText(screen.getByLabelText('Monto 2'), '20');
    await addLine();
    await chooseCategory(3, 'Obligaciones del hogar');
    await fireEvent.changeText(screen.getByLabelText('Monto 3'), '30');

    // "Counts for" is shown before saving; the budget is never chosen by hand (RN-17, RN-41).
    expect(screen.getAllByText(/Cuenta para: Alimentación/)).toHaveLength(1);
    expect(screen.getAllByText(/Cuenta para: Entretenimiento/)).toHaveLength(1);
    expect(screen.getByText('Sin sobre activo en USD')).toBeTruthy();
    expect(screen.getByText(/USD\s0,00 ✓/)).toBeTruthy(); // nothing left to assign

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar gasto' }));

    await waitFor(() => expect(saved).toBe(true));
    const [stored] = await repository.list();
    expect(stored).toMatchObject({
      kind: 'EXPENSE',
      currency: 'USD',
      totalMinor: 10000,
      paymentMethod: 'CASH',
    });
    expect(stored?.lines.map((line) => [line.categoryId, line.amountMinor, line.budgetId])).toEqual(
      [
        [FOOD, 5000, 'b-food'],
        [FUN, 2000, 'b-fun'],
        [HOME, 3000, null],
      ],
    );
  });

  it('RN-14 one empty line takes the whole total (and goes to SIN_CLASIFICAR by default)', async () => {
    let saved = false;
    await render(<MovementForm categories={categories} onSaved={() => (saved = true)} />, {
      wrapper: Providers,
    });

    await fireEvent.changeText(screen.getByLabelText('Monto total'), '15000');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar gasto' }));

    await waitFor(() => expect(saved).toBe(true));
    const [stored] = await repository.list();
    expect(stored).toMatchObject({ currency: 'COP', totalMinor: 15000 });
    expect(stored?.lines).toHaveLength(1);
    expect(stored?.lines[0]).toMatchObject({ amountMinor: 15000 });
    const unclassified = categories.find((c) => c.isSystem && c.code === 'SIN_CLASIFICAR');
    expect(stored?.lines[0]?.categoryId).toBe(unclassified?.id);
  });

  it('a new line starts in "Sin clasificar" even if the categories load after the form opens', async () => {
    // The first render has no categories yet (they come from the database a moment later).
    const view = await render(<MovementForm categories={[]} onSaved={() => undefined} />, {
      wrapper: Providers,
    });
    await view.rerender(<MovementForm categories={categories} onSaved={() => undefined} />);

    expect(await screen.findByText('Sin clasificar')).toBeTruthy();
  });

  it('RN-14 tells how much is left to share and rejects lines that do not add up', async () => {
    let saved = false;
    await render(<MovementForm categories={categories} onSaved={() => (saved = true)} />, {
      wrapper: Providers,
    });

    await fireEvent.changeText(screen.getByLabelText('Monto total'), '100000');
    await fireEvent.changeText(screen.getByLabelText('Monto 1'), '60000');
    await addLine(); // takes what is left: 40.000
    await fireEvent.changeText(screen.getByLabelText('Monto 2'), '30000');

    expect(await screen.findByText('Por repartir')).toBeTruthy();
    expect(screen.getByText(/^COP\s10\.000$/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar gasto' }));

    expect(await screen.findByText('Las líneas deben sumar el total.')).toBeTruthy();
    expect(saved).toBe(false);
    expect(await repository.list()).toEqual([]);
  });

  it('with one line, its field suggests the total it will take', async () => {
    await render(<MovementForm categories={categories} onSaved={() => undefined} />, {
      wrapper: Providers,
    });
    expect(screen.getByLabelText('Monto 1').props.placeholder).toBe('0');

    await fireEvent.changeText(screen.getByLabelText('Monto total'), '15000');

    expect(screen.getByLabelText('Monto 1').props.placeholder).toBe('15.000');
  });

  it('shows the thousands separator while typing, and saves the plain number', async () => {
    let saved = false;
    await render(<MovementForm categories={categories} onSaved={() => (saved = true)} />, {
      wrapper: Providers,
    });

    const total = screen.getByLabelText('Monto total');
    await fireEvent.changeText(total, '1');
    await fireEvent.changeText(screen.getByLabelText('Monto total'), '15');
    await fireEvent.changeText(screen.getByLabelText('Monto total'), '150');
    await fireEvent.changeText(screen.getByLabelText('Monto total'), '1500');
    expect(screen.getByLabelText('Monto total').props.value).toBe('1.500');
    await fireEvent.changeText(screen.getByLabelText('Monto total'), '1.5000');
    expect(screen.getByLabelText('Monto total').props.value).toBe('15.000');

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar gasto' }));

    await waitFor(() => expect(saved).toBe(true));
    expect((await repository.list())[0]?.totalMinor).toBe(15000);
  });

  it('a line amount is grouped too, and the left to assign is worked out from the plain numbers', async () => {
    await render(<MovementForm categories={categories} onSaved={() => undefined} />, {
      wrapper: Providers,
    });

    await fireEvent.changeText(screen.getByLabelText('Monto total'), '1250000');
    await fireEvent.changeText(screen.getByLabelText('Monto 1'), '1000000');

    expect(screen.getByLabelText('Monto total').props.value).toBe('1.250.000');
    expect(screen.getByLabelText('Monto 1').props.value).toBe('1.000.000');
    await addLine();
    expect(screen.getByLabelText('Monto 2').props.value).toBe('250.000');
  });

  it('a new line takes what is left to assign', async () => {
    await render(<MovementForm categories={categories} onSaved={() => undefined} />, {
      wrapper: Providers,
    });

    await fireEvent.changeText(screen.getByLabelText('Monto total'), '100000');
    await fireEvent.changeText(screen.getByLabelText('Monto 1'), '60000');
    await addLine();

    expect(screen.getByLabelText('Monto 2').props.value).toBe('40.000');
  });

  it('RN-20 shows the amount error for the currency decimals', async () => {
    await render(<MovementForm categories={categories} onSaved={() => undefined} />, {
      wrapper: Providers,
    });

    await fireEvent.changeText(screen.getByLabelText('Monto total'), '10,5'); // COP has no decimals
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar gasto' }));

    // The single line takes the total, so both fields show the error.
    expect(
      (await screen.findAllByText('Esta moneda no admite tantos decimales.')).length,
    ).toBeGreaterThan(0);
  });

  it('RN-16 refuses a date in the future', async () => {
    let saved = false;
    await render(<MovementForm categories={categories} onSaved={() => (saved = true)} />, {
      wrapper: Providers,
    });

    await fireEvent.changeText(screen.getByLabelText('Monto total'), '5000');
    mockPickedDate = new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000);
    await fireEvent.press(screen.getByLabelText('Fecha y hora: Fecha'));
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar gasto' }));

    expect(await screen.findByText('La fecha y hora no pueden ser futuras.')).toBeTruthy();
    expect(saved).toBe(false);
  });

  it('RN-18 warns when a line falls in a closed budget, and still saves it without that budget', async () => {
    setup([], [budget('b-old', FUN, -30, -20, 'CLOSED')]);
    let saved = false;
    await render(<MovementForm categories={categories} onSaved={() => (saved = true)} />, {
      wrapper: Providers,
    });

    await chooseCurrency('USD');
    await fireEvent.changeText(screen.getByLabelText('Monto total'), '40');
    await chooseCategory(1, 'Entretenimiento');
    mockPickedDate = new Date(`${day(-25)}T12:00:00`);
    await fireEvent.press(screen.getByLabelText('Fecha y hora: Fecha'));

    expect(await screen.findAllByText(/pertenece a un presupuesto cerrado/)).not.toHaveLength(0);
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar gasto' }));

    await waitFor(() => expect(saved).toBe(true));
    expect((await repository.list())[0]?.lines[0]?.budgetId).toBeNull();
  });

  it('the kind (expense, refund, income) is picked in one control and names the save button', async () => {
    await render(<MovementForm categories={categories} onSaved={() => undefined} />, {
      wrapper: Providers,
    });
    expect(screen.getByRole('radio', { name: 'Gasto', selected: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Guardar gasto' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: 'Reembolso' }));
    expect(screen.getByRole('button', { name: 'Guardar reembolso' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: 'Ingreso' }));
    expect(screen.getByRole('button', { name: 'Guardar ingreso' })).toBeTruthy();
  });

  it('RN-19 the payment method is one of five chips, "Efectivo" by default', async () => {
    let saved = false;
    await render(<MovementForm categories={categories} onSaved={() => (saved = true)} />, {
      wrapper: Providers,
    });
    expect(screen.getByRole('radio', { name: 'Efectivo', selected: true })).toBeTruthy();
    expect(
      screen.getAllByRole('radio', {
        name: /Efectivo|Tarjeta débito|Tarjeta de crédito|Transferencia|Otro/,
      }),
    ).toHaveLength(5);

    await fireEvent.press(screen.getByRole('radio', { name: 'Transferencia' }));
    await fireEvent.changeText(screen.getByLabelText('Monto total'), '5000');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar gasto' }));

    await waitFor(() => expect(saved).toBe(true));
    expect((await repository.list())[0]?.paymentMethod).toBe('TRANSFER');
  });

  it('the currency is chosen from the chip next to the amount', async () => {
    await render(<MovementForm categories={categories} onSaved={() => undefined} />, {
      wrapper: Providers,
    });
    expect(screen.getByRole('button', { name: 'Moneda: COP' })).toBeTruthy();

    await chooseCurrency('EUR');

    expect(screen.getByRole('button', { name: 'Moneda: EUR' })).toBeTruthy();
  });

  it('a split line can be removed', async () => {
    await render(<MovementForm categories={categories} onSaved={() => undefined} />, {
      wrapper: Providers,
    });
    await addLine();
    expect(screen.getAllByLabelText(/^Monto \d$/)).toHaveLength(2);

    await fireEvent.press(screen.getByRole('button', { name: 'Quitar línea 2' }));

    expect(screen.getAllByLabelText(/^Monto \d$/)).toHaveLength(1);
  });
});

describe('income (sketch 4: "Is it for an envelope?")', () => {
  async function openIncome(onSaved: () => void = () => undefined) {
    await render(<MovementForm categories={categories} onSaved={onSaved} />, {
      wrapper: Providers,
    });
    await fireEvent.press(screen.getByRole('radio', { name: 'Ingreso' }));
  }

  it('RN-41 a general income (salary) has nothing to split and adds to no envelope', async () => {
    setup([], [budget('b-fun', FUN, -5, 5)]);
    let saved = false;
    await openIncome(() => (saved = true));

    expect(screen.queryByLabelText('Monto 1')).toBeNull(); // no lines to show
    await chooseCurrency('USD');
    await fireEvent.changeText(screen.getByLabelText('Monto total'), '15');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar ingreso' }));

    await waitFor(() => expect(saved).toBe(true));
    const [stored] = await repository.list();
    const unclassified = categories.find((c) => c.isSystem && c.code === 'SIN_CLASIFICAR');
    expect(stored).toMatchObject({ kind: 'INCOME', totalMinor: 1500 });
    expect(stored?.lines).toEqual([
      expect.objectContaining({ categoryId: unclassified?.id, amountMinor: 1500, budgetId: null }),
    ]);
  });

  it('RN-23 an income for an envelope says what it does to the envelope, and counts for it', async () => {
    // Entretenimiento USD 55 with USD 30 spent: the income of USD 15 takes it to 70, USD 40 left.
    setup([], [budget('b-fun', FUN, -5, 5)], {
      'b-fun': { amountMinor: 5500, expenseMinor: 3000, refundMinor: 0, incomeMinor: 0 },
    });
    let saved = false;
    await openIncome(() => (saved = true));

    await fireEvent(screen.getByLabelText('¿Es para un sobre?'), 'valueChange', true);
    await chooseCurrency('USD');
    await fireEvent.changeText(screen.getByLabelText('Monto total'), '15');
    await chooseCategory(1, 'Entretenimiento');

    expect(screen.getByText(/Suma al sobre: Entretenimiento/)).toBeTruthy();
    expect(
      screen.getByText(
        /El sobre pasará de USD\s55,00 a USD\s70,00 de cupo\. Quedarán USD\s40,00\./,
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar ingreso' }));

    await waitFor(() => expect(saved).toBe(true));
    const [stored] = await repository.list();
    expect(stored?.lines[0]).toMatchObject({
      categoryId: FUN,
      amountMinor: 1500,
      budgetId: 'b-fun',
    });
  });

  it('turning "for an envelope" off goes back to a general income', async () => {
    await openIncome();
    await fireEvent(screen.getByLabelText('¿Es para un sobre?'), 'valueChange', true);
    expect(screen.getByLabelText('Monto 1')).toBeTruthy();

    await fireEvent(screen.getByLabelText('¿Es para un sobre?'), 'valueChange', false);

    expect(screen.queryByLabelText('Monto 1')).toBeNull();
  });

  it('only an income shows the "for an envelope" switch', async () => {
    await render(<MovementForm categories={categories} onSaved={() => undefined} />, {
      wrapper: Providers,
    });
    expect(screen.queryByLabelText('¿Es para un sobre?')).toBeNull();

    await fireEvent.press(screen.getByRole('radio', { name: 'Ingreso' }));

    expect(screen.getByLabelText('¿Es para un sobre?')).toBeTruthy();
  });
});

describe('date and time chip', () => {
  it('on Android it shows "Hoy" with the time and opens the system dialogs when pressed', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await render(<MovementForm categories={categories} onSaved={() => undefined} />, {
      wrapper: Providers,
    });

    const chip = screen.getByRole('button', {
      name: /^Fecha y hora: Hoy \d{1,2}:\d{2} [ap]\. m\.$/,
    });
    await fireEvent.press(chip);

    expect(DateTimePickerAndroid.open).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'date' }),
    );
  });
});

describe('editing and deleting a movement', () => {
  it('RN-39 editing the movement changes it and reassigns its budget', async () => {
    setup([movement('m1')], [budget('b-fun', FUN, -5, 5)]);
    let saved = false;
    await render(
      <MovementForm categories={categories} movementId="m1" onSaved={() => (saved = true)} />,
      { wrapper: Providers },
    );

    await fireEvent.changeText(await screen.findByLabelText('Monto total'), '55');
    await fireEvent.changeText(screen.getByLabelText('Monto 1'), '55');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(saved).toBe(true));
    const edited = await repository.get('m1');
    expect(edited).toMatchObject({ totalMinor: 5500 });
    expect(edited?.lines[0]?.budgetId).toBe('b-fun');
  });

  it('RN-08 / RN-18 a movement counting in a closed budget cannot be edited or deleted', async () => {
    const locked = movement('m1', {
      lines: [{ id: 'l1', categoryId: FUN, budgetId: 'b-old', amountMinor: 4000 }],
    });
    setup([locked], [budget('b-old', FUN, -30, -20, 'CLOSED')]);
    await render(
      <MovementForm categories={categories} movementId="m1" onSaved={() => undefined} />,
      { wrapper: Providers },
    );

    expect(await screen.findByText(/cuenta en un presupuesto cerrado/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Borrar' })).toBeDisabled();
  });

  it('RN-21 deleting asks first, then hides the movement', async () => {
    setup([movement('m1')]);
    let done = false;
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await render(
      <MovementForm categories={categories} movementId="m1" onSaved={() => (done = true)} />,
      { wrapper: Providers },
    );

    await fireEvent.press(await screen.findByRole('button', { name: 'Borrar' }));
    expect(alert).toHaveBeenCalledWith(
      '¿Borrar este movimiento?',
      expect.any(String),
      expect.any(Array),
    );
    expect(await repository.list()).toHaveLength(1);

    const buttons = alert.mock.calls[0]?.[2] as AlertButton[];
    buttons.find((button) => button.style === 'destructive')?.onPress?.();

    await waitFor(() => expect(done).toBe(true));
    expect(await repository.list()).toEqual([]);
  });
});

describe('movement history', () => {
  const noop = () => undefined;

  it('shows an empty message with no movements', async () => {
    await render(<MovementList categories={categories} onCreate={noop} onOpen={noop} />, {
      wrapper: Providers,
    });

    expect(await screen.findByText('Aún no tienes movimientos.')).toBeTruthy();
  });

  it('RN-33 shows totals per currency, never mixed', async () => {
    setup([
      movement('1', { totalMinor: 4000 }),
      movement('2', { totalMinor: 1000, kind: 'REFUND' }),
      movement('3', { currency: 'COP', totalMinor: 50000 }),
    ]);
    await render(<MovementList categories={categories} onCreate={noop} onOpen={noop} />, {
      wrapper: Providers,
    });

    const usd = await screen.findByLabelText('USD Totales');
    expect(usd).toHaveTextContent(/GastosUSD\s40,00/);
    expect(usd).toHaveTextContent(/ReembolsosUSD\s10,00/);
    expect(screen.getByLabelText('COP Totales')).toHaveTextContent(/GastosCOP\s50\.000/);
  });

  it('filters by kind and by currency', async () => {
    setup([
      movement('1'),
      movement('2', { kind: 'INCOME', totalMinor: 9900 }),
      movement('3', { currency: 'COP', totalMinor: 50000 }),
    ]);
    await render(<MovementList categories={categories} onCreate={noop} onOpen={noop} />, {
      wrapper: Providers,
    });
    expect(await screen.findAllByRole('button', { name: /Gasto|Ingreso/ })).toHaveLength(3);

    await fireEvent.press(screen.getByRole('radio', { name: 'Ingreso' }));
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /^(Gasto|Ingreso) / })).toHaveLength(1),
    );

    await fireEvent.press(screen.getByRole('radio', { name: 'Todos', selected: false }));
  });

  it('shows the history in pages: 45 movements are not all drawn at once', async () => {
    setup(
      Array.from({ length: 45 }, (_, i) =>
        movement(`m-${i}`, {
          localDate: day(-(i + 1)),
          occurredAt: `${day(-(i + 1))}T10:00:00-05:00`,
        }),
      ),
    );
    await render(<MovementList categories={categories} onCreate={noop} onOpen={noop} />, {
      wrapper: Providers,
    });

    const rows = await screen.findAllByRole('button', { name: /^Gasto / });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(20);
  });

  it('opens a movement when its row is pressed', async () => {
    setup([movement('m1')]);
    let opened = '';
    await render(
      <MovementList categories={categories} onCreate={noop} onOpen={(id) => (opened = id)} />,
      { wrapper: Providers },
    );

    await fireEvent.press(await screen.findByRole('button', { name: /Gasto/ }));

    expect(opened).toBe('m1');
  });
});
