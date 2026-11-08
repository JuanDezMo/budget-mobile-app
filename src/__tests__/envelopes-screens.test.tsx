import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert, StyleSheet } from 'react-native';
import type { AlertButton } from 'react-native';

import { SEED_SYSTEM_CATEGORIES } from '@/core/db/seed-data';
import { initI18n, setAppLanguage } from '@/core/i18n/i18n';
import { addDaysToLocalDate, todayLocalDate } from '@/core/shared/dates';
import { ThemeProvider } from '@/core/theme/ThemeProvider';
import { darkColors, lightColors } from '@/core/theme/tokens';
import { createInMemoryBudgetRepository } from '@/features/budgets/budget.repository';
import type { BudgetRepository } from '@/features/budgets/budget.repository';
import type { Budget, BudgetLine, UsageTotals } from '@/features/budgets/budget.types';
import { BudgetDetail } from '@/features/budgets/components/BudgetDetail';
import { BudgetList } from '@/features/budgets/components/BudgetList';
import { leftPercentage } from '@/core/theme/EnvelopeFrame';
import { ENVELOPE_HERO_HEIGHT } from '@/features/budgets/components/EnvelopeHero';
import { OpenBudgetsOverview } from '@/features/budgets/components/OpenBudgetsOverview';
import { layoutBandLabels } from '@/features/budgets/components/ThresholdBands';
import { BudgetRepositoryProvider } from '@/features/budgets/useBudgetRepository';
import { useBudgetDetail } from '@/features/budgets/useBudgetDetail';
import type { Category } from '@/features/categories/category.types';

// The envelopes of src-app.md ("Sobres de la quincena"): grid of two columns, fill = what is left,
// band with the color of the category, thresholds as bands in the detail.
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
const ENTRETENIMIENTO = SEED_SYSTEM_CATEGORIES[2]?.id ?? '';
const ENTRETENIMIENTO_COLOR = SEED_SYSTEM_CATEGORIES[2]?.color ?? '';
const today = todayLocalDate();
const day = (offset: number) => addDaysToLocalDate(today, offset);

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

function makeRepository(
  budgets: Budget[] = [],
  fake: { usageById?: Record<string, UsageTotals>; linesById?: Record<string, BudgetLine[]> } = {},
) {
  let n = 0;
  repository = createInMemoryBudgetRepository(budgets, () => `new-${(n += 1)}`, {}, fake);
}

// The detail component is given the hook result by its screen; this does the same.
function DetailHarness(props: {
  budgetId: string;
  thresholds?: number[];
  onDeleted?: () => void;
  onOpenMovement?: (id: string) => void;
}) {
  const detail = useBudgetDetail(props.budgetId);

  return (
    <BudgetDetail
      detail={detail}
      categories={categories}
      thresholds={props.thresholds ?? []}
      onDeleted={props.onDeleted ?? (() => undefined)}
      onOpenMovement={props.onOpenMovement ?? (() => undefined)}
    />
  );
}

const noop = () => undefined;
const style = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, unknown>;

beforeEach(async () => {
  makeRepository();
  await initI18n('es');
  await setAppLanguage('es');
  jest.restoreAllMocks();
});

describe('left percentage (what fills the envelope)', () => {
  it('is what is left of what is available, from 0 to 100', () => {
    expect(leftPercentage(4000, 7000)).toBeCloseTo(57.14, 2);
    expect(leftPercentage(5500, 5500)).toBe(100);
    expect(leftPercentage(0, 5500)).toBe(0);
  });

  it('never goes below empty or above full, and an empty budget is empty', () => {
    expect(leftPercentage(-2500, 5500)).toBe(0); // exceeded
    expect(leftPercentage(9000, 5500)).toBe(100);
    expect(leftPercentage(100, 0)).toBe(0);
  });
});

describe('envelope card (home and budgets list)', () => {
  // The example of the rules: USD 55, spent 30 of 70 available -> USD 40 left.
  const example: UsageTotals = { expenseMinor: 4000, refundMinor: 1000, incomeMinor: 1500 };

  it('is filled up to what is left, not up to what was spent', async () => {
    makeRepository([budgetEndingIn('b1', 5)], { usageById: { b1: example } });
    await render(<BudgetList categories={categories} onCreate={noop} onOpen={noop} />, {
      wrapper: Providers,
    });

    await screen.findByText('Entretenimiento');
    const height = String(style('envelope-fill').height);
    expect(parseFloat(height)).toBeCloseTo(57.14, 1); // 40 of 70
    expect(height.endsWith('%')).toBe(true);
  });

  it('a budget with no spending is full, and shows everything left', async () => {
    makeRepository([budgetEndingIn('b1', 5)]);
    await render(<BudgetList categories={categories} onCreate={noop} onOpen={noop} />, {
      wrapper: Providers,
    });

    await screen.findByText('Entretenimiento');
    expect(style('envelope-fill').height).toBe('100%');
    expect(screen.getByText('Queda')).toBeTruthy();
    expect(screen.getByText(/USD\s55,00/)).toBeTruthy();
  });

  it('shows the name, the short period and what is left at the bottom', async () => {
    makeRepository([budgetEndingIn('b1', 5)], { usageById: { b1: example } });
    await render(<BudgetList categories={categories} onCreate={noop} onOpen={noop} />, {
      wrapper: Providers,
    });

    expect(await screen.findByText('Entretenimiento')).toBeTruthy();
    expect(
      screen.getByText(/^\d{1,2}(–\d{1,2})? [a-z]{3}\.?( – \d{1,2} [a-z]{3}\.?)?$/),
    ).toBeTruthy();
    expect(screen.getByText('Queda')).toBeTruthy();
    expect(screen.getByText(/USD\s40,00/)).toBeTruthy();
  });

  it('has the band with the color of its category', async () => {
    makeRepository([budgetEndingIn('b1', 5)]);
    await render(<BudgetList categories={categories} onCreate={noop} onOpen={noop} />, {
      wrapper: Providers,
    });

    await screen.findByText('Entretenimiento');
    expect(style('envelope-band').backgroundColor).toBe(ENTRETENIMIENTO_COLOR);
    expect(style('envelope-band').width).toBe(8);
  });

  it('RN-29 exceeded: empty fill, "Te pasaste", the over color and no red background', async () => {
    makeRepository([budgetEndingIn('b1', 5)], {
      usageById: { b1: { expenseMinor: 8000, refundMinor: 0, incomeMinor: 0 } },
    });
    await render(<BudgetList categories={categories} onCreate={noop} onOpen={noop} />, {
      wrapper: Providers,
    });

    await screen.findByText('Entretenimiento');
    expect(style('envelope-fill').height).toBe('0%');
    expect(screen.getByText('Te pasaste')).toBeTruthy();
    expect(screen.getByText('Excedido')).toBeTruthy();
    expect(screen.getByText(/USD\s25,00/)).toBeTruthy(); // how much over
    expect(screen.getByRole('button', { name: /Entretenimiento, Te pasaste/ })).toBeTruthy();
    expect(style('envelope-frame').borderColor).toBe(lightColors.over);
    expect(style('envelope-frame').backgroundColor).toBe(lightColors.surface); // border and text, not a red fill
  });

  it('RN-09 a closed budget with money left shows it as saved', async () => {
    makeRepository([budgetEndingIn('b1', -30, { status: 'CLOSED', spentFinalMinor: 3000 })]);
    await render(<BudgetList categories={categories} onCreate={noop} onOpen={noop} />, {
      wrapper: Providers,
    });

    expect(await screen.findByText('Ahorrado')).toBeTruthy();
    expect(screen.getByText(/USD\s25,00/)).toBeTruthy();
  });

  it('RN-05 a budget in its grace period says so', async () => {
    makeRepository([budgetEndingIn('b1', -2)]);
    await render(<BudgetList categories={categories} onCreate={noop} onOpen={noop} />, {
      wrapper: Providers,
    });

    expect(await screen.findByText(/En gracia/)).toBeTruthy();
  });

  it('RN-05 groups the envelopes under active, grace and closed', async () => {
    makeRepository([budgetEndingIn('a', 5), budgetEndingIn('g', -3), budgetEndingIn('c', -30)]);
    await render(<BudgetList categories={categories} onCreate={noop} onOpen={noop} />, {
      wrapper: Providers,
    });

    expect(await screen.findByText('ACTIVOS')).toBeTruthy();
    expect(screen.getByText('EN PERIODO DE GRACIA')).toBeTruthy();
    expect(screen.getByText('CERRADOS')).toBeTruthy();
    expect(screen.getAllByText('Entretenimiento')).toHaveLength(3);
  });

  it('lays the envelopes out in two columns of the same width', async () => {
    makeRepository([budgetEndingIn('a', 5), budgetEndingIn('b', -3, { categoryId: FOOD })]);
    await render(<BudgetList categories={categories} onCreate={noop} onOpen={noop} />, {
      wrapper: Providers,
    });

    const cards = await screen.findAllByRole('button', { name: /Queda/ });
    const widths = cards.map(
      (card) => (StyleSheet.flatten(card.props.style) as { width: number }).width,
    );

    expect(widths).toHaveLength(2);
    expect(widths[0]).toBe(widths[1]);
    expect(widths[0]).toBeGreaterThan(100);
    // two cards + the gap + both side paddings fit in the width of the screen
    expect((widths[0] ?? 0) * 2 + 12 + 32).toBeLessThanOrEqual(750);
  });

  it('shows the empty message with no budgets, and opens a budget when its envelope is pressed', async () => {
    await render(<BudgetList categories={categories} onCreate={noop} onOpen={noop} />, {
      wrapper: Providers,
    });
    expect(await screen.findByText('Aún no tienes presupuestos.')).toBeTruthy();
  });

  it('opens the budget when its envelope is pressed', async () => {
    makeRepository([budgetEndingIn('a', 5)]);
    let opened = '';
    await render(
      <BudgetList categories={categories} onCreate={noop} onOpen={(id) => (opened = id)} />,
      { wrapper: Providers },
    );

    await fireEvent.press(await screen.findByRole('button', { name: /Entretenimiento/ }));

    expect(opened).toBe('a');
  });
});

describe('dark mode', () => {
  function DarkProviders({ children }: { children: ReactNode }) {
    return (
      <BudgetRepositoryProvider value={repository}>
        <ThemeProvider mode="DARK">{children}</ThemeProvider>
      </BudgetRepositoryProvider>
    );
  }

  it('the fill is translucent with a solid edge on top, so the light text stays readable', async () => {
    makeRepository([budgetEndingIn('b1', 5)], {
      usageById: { b1: { expenseMinor: 2750, refundMinor: 0, incomeMinor: 0 } },
    });
    await render(<BudgetList categories={categories} onCreate={noop} onOpen={noop} />, {
      wrapper: DarkProviders,
    });

    await screen.findByText('Entretenimiento');
    expect(style('envelope-fill').opacity).toBe(0.3);
    expect(style('envelope-fill-edge').backgroundColor).toBe(darkColors.manila);
    expect(style('envelope-fill-edge').bottom).toBe('50%'); // half is left
  });

  it('a full envelope has no edge line (nothing is empty)', async () => {
    makeRepository([budgetEndingIn('b1', 5)]);
    await render(<BudgetList categories={categories} onCreate={noop} onOpen={noop} />, {
      wrapper: DarkProviders,
    });

    await screen.findByText('Entretenimiento');
    expect(screen.queryByTestId('envelope-fill-edge')).toBeNull();
  });

  it('in light mode the fill is solid manila', async () => {
    makeRepository([budgetEndingIn('b1', 5)]);
    await render(<BudgetList categories={categories} onCreate={noop} onOpen={noop} />, {
      wrapper: Providers,
    });

    await screen.findByText('Entretenimiento');
    expect(style('envelope-fill').opacity).toBe(1);
    expect(style('envelope-fill').backgroundColor).toBe(lightColors.manila);
  });
});

describe('home ("Tus sobres")', () => {
  it('RN-33 says what is left per currency in one sentence, never added across currencies', async () => {
    makeRepository(
      [
        budgetEndingIn('usd', 5),
        { ...budgetEndingIn('cop', 5, { categoryId: FOOD }), currency: 'COP', amountMinor: 500000 },
      ],
      {
        usageById: {
          usd: { expenseMinor: 3000, refundMinor: 0, incomeMinor: 0 },
          cop: { expenseMinor: 125000, refundMinor: 0, incomeMinor: 0 },
        },
      },
    );
    await render(<OpenBudgetsOverview categories={categories} onOpen={noop} />, {
      wrapper: Providers,
    });

    const sentence = await screen.findByText(/^Quedan /);
    expect(sentence).toHaveTextContent(/Quedan COP\s375\.000 y USD\s25,00/);
  });

  it('shows the title area with the date and the title of the home', async () => {
    makeRepository([budgetEndingIn('a', 5)]);
    await render(<OpenBudgetsOverview categories={categories} onOpen={noop} />, {
      wrapper: Providers,
    });

    expect(await screen.findByText('Tus sobres')).toBeTruthy();
    expect(screen.getByText(/·\s\d{1,2}\s[a-z]{3}/)).toBeTruthy();
  });

  it('shows an envelope for each open budget, and none for closed ones', async () => {
    makeRepository([budgetEndingIn('a', 5), budgetEndingIn('g', -2), budgetEndingIn('c', -30)]);
    await render(<OpenBudgetsOverview categories={categories} onOpen={noop} />, {
      wrapper: Providers,
    });

    expect(await screen.findAllByRole('button', { name: /Entretenimiento/ })).toHaveLength(2);
  });

  it('says there are no open budgets when all are closed', async () => {
    makeRepository([budgetEndingIn('old', -30, { status: 'CLOSED', spentFinalMinor: 100 })]);
    await render(<OpenBudgetsOverview categories={categories} onOpen={noop} />, {
      wrapper: Providers,
    });

    expect(await screen.findByText('No tienes presupuestos abiertos.')).toBeTruthy();
  });
});

describe('envelope detail', () => {
  const example: UsageTotals = { expenseMinor: 4000, refundMinor: 1000, incomeMinor: 1500 };
  const line = (
    id: string,
    kind: BudgetLine['kind'],
    amountMinor: number,
    overrides: Partial<BudgetLine> = {},
  ): BudgetLine => ({
    lineId: `l-${id}`,
    movementId: `m-${id}`,
    kind,
    localDate: day(-1),
    note: null,
    paymentMethod: 'CASH',
    categoryId: ENTRETENIMIENTO,
    amountMinor,
    movementLineCount: 1,
    budgetLineCount: 1,
    ...overrides,
  });

  it('shows the big envelope: what is left, "of" what, the period and the state', async () => {
    makeRepository([budgetEndingIn('b1', 5)], { usageById: { b1: example } });
    await render(<DetailHarness budgetId="b1" />, { wrapper: Providers });

    expect(await screen.findByText('Queda en el sobre')).toBeTruthy();
    expect(screen.getAllByText(/USD\s40,00/).length).toBeGreaterThan(0); // big number (and gross expenses)
    expect(screen.getByText(/de USD\s70,00 · .* · activo/)).toBeTruthy();
    expect(parseFloat(String(style('envelope-fill').height))).toBeCloseTo(57.14, 1);
    expect(style('envelope-band').width).toBe(10);
  });

  it('draws the alert thresholds as bands, at the height of what would be left', async () => {
    makeRepository([budgetEndingIn('b1', 5)], {
      usageById: { b1: { expenseMinor: 3000, refundMinor: 0, incomeMinor: 0 } },
    });
    await render(<DetailHarness budgetId="b1" thresholds={[50, 90, 100]} />, {
      wrapper: Providers,
    });

    await screen.findByText('Queda en el sobre');
    expect(style('liga-50').bottom).toBe('50%'); // 50% used = 50% left
    expect(style('liga-90').bottom).toBe('10%');
    expect(style('liga-100').bottom).toBe('0%');
    expect(screen.getByText('50 %')).toBeTruthy();
    expect(screen.getByText('90 %')).toBeTruthy();
    expect(screen.getByText('100 %')).toBeTruthy();
  });

  it('the amount left ends above the 50 % band, so the most common alert never crosses it', async () => {
    makeRepository([budgetEndingIn('b1', 5)], { usageById: { b1: example } });
    await render(<DetailHarness budgetId="b1" thresholds={[50]} />, { wrapper: Providers });
    await screen.findByText('Queda en el sobre');

    const top = Number(style('envelope-amount').top);
    const captionAndAmount = 18 + 62; // line heights of the caption and the big amount
    expect(top).toBeGreaterThanOrEqual(46); // under the flap
    expect(top + captionAndAmount).toBeLessThanOrEqual(ENVELOPE_HERO_HEIGHT / 2 - 8);
  });

  it('band labels that would touch (90 % and 100 % on a short envelope) move apart', () => {
    const short = layoutBandLabels([50, 90, 100], 190);
    expect(short.get(50)?.column).toBe(0);
    expect(short.get(90)?.column).toBe(0);
    expect(short.get(100)?.column).toBe(1);

    // On the taller detail envelope they fit one over the other, in line.
    const tall = layoutBandLabels([90, 100], ENVELOPE_HERO_HEIGHT);
    expect(tall.get(100)?.column).toBe(0);
    expect((tall.get(100)?.top ?? 0) - (tall.get(90)?.top ?? 0)).toBeGreaterThanOrEqual(26);
  });

  it('a band already crossed is solid, the others are dashed', async () => {
    // 30 of 55 spent = 54.5%: the 50% band was crossed, the 90% was not.
    makeRepository([budgetEndingIn('b1', 5)], {
      usageById: { b1: { expenseMinor: 3000, refundMinor: 0, incomeMinor: 0 } },
    });
    await render(<DetailHarness budgetId="b1" thresholds={[50, 90]} />, { wrapper: Providers });

    await screen.findByText('Queda en el sobre');
    expect(style('liga-line-50').borderStyle).toBe('solid');
    expect(style('liga-line-90').borderStyle).toBe('dashed');
  });

  it('shows the three figures: spent, refunds and used', async () => {
    makeRepository([budgetEndingIn('b1', 5)], { usageById: { b1: example } });
    await render(<DetailHarness budgetId="b1" />, { wrapper: Providers });

    await screen.findByText('Queda en el sobre');
    expect(screen.getByText('Gastado')).toBeTruthy();
    expect(screen.getAllByText(/^USD\s40,00$/)).toHaveLength(2); // gross expenses, and what is left
    expect(screen.getByText('Reembolsos')).toBeTruthy();
    expect(screen.getByText(/^−USD\s10,00$/)).toBeTruthy();
    expect(screen.getByText('Usado')).toBeTruthy();
    expect(screen.getByText(/^42,9\s?%$/)).toBeTruthy();
  });

  it('RN-29 exceeded: says by how much you went over', async () => {
    makeRepository([budgetEndingIn('b1', 5)], {
      usageById: { b1: { expenseMinor: 8000, refundMinor: 0, incomeMinor: 0 } },
    });
    await render(<DetailHarness budgetId="b1" />, { wrapper: Providers });

    expect(await screen.findByText('Te pasaste por')).toBeTruthy();
    expect(screen.getByText(/USD\s25,00/)).toBeTruthy();
    expect(style('envelope-fill').height).toBe('0%');
  });

  it('RN-09 closed with money left: saved', async () => {
    makeRepository([budgetEndingIn('b1', -30, { status: 'CLOSED', spentFinalMinor: 3000 })]);
    await render(<DetailHarness budgetId="b1" />, { wrapper: Providers });

    expect(await screen.findByText('Ahorrado')).toBeTruthy();
    expect(screen.getByText(/de USD\s55,00 · .* · cerrado/)).toBeTruthy();
  });

  it('lists the movements of the envelope with their date, payment method and sign', async () => {
    const lines = [
      line('1', 'EXPENSE', 4000, { note: 'Cinema', paymentMethod: 'DEBIT_CARD' }),
      line('2', 'REFUND', 1000),
      line('3', 'INCOME', 1500),
    ];
    makeRepository([budgetEndingIn('b1', 5)], {
      usageById: { b1: example },
      linesById: { b1: lines },
    });
    await render(<DetailHarness budgetId="b1" />, { wrapper: Providers });

    expect(await screen.findByText('MOVIMIENTOS')).toBeTruthy();
    expect(screen.getByText('USD')).toBeTruthy();
    expect(screen.getByText('Cinema')).toBeTruthy(); // the note is the title
    expect(screen.getByText(/· Tarjeta débito$/)).toBeTruthy();
    expect(screen.getByText(/^−USD\s40,00$/)).toBeTruthy();
    expect(screen.getByText(/^\+USD\s10,00$/)).toBeTruthy();
    expect(screen.getByText(/^\+USD\s15,00$/)).toBeTruthy();
    expect(screen.getByText('Reembolso')).toBeTruthy(); // no note: the kind is the title
  });

  it('marks a split purchase with "1 de 3"', async () => {
    const lines = [
      line('1', 'EXPENSE', 4000, { note: 'Mercado', movementLineCount: 3, budgetLineCount: 1 }),
      line('2', 'EXPENSE', 500, { note: 'Pan' }),
    ];
    makeRepository([budgetEndingIn('b1', 5)], { linesById: { b1: lines } });
    await render(<DetailHarness budgetId="b1" />, { wrapper: Providers });

    expect(await screen.findByText('1 de 3')).toBeTruthy();
    expect(screen.getAllByText(/ de \d$/)).toHaveLength(1); // the single-line movement has no chip
  });

  it('opens the movement when its row is pressed', async () => {
    makeRepository([budgetEndingIn('b1', 5)], {
      linesById: { b1: [line('1', 'EXPENSE', 4000, { note: 'Cinema' })] },
    });
    let opened = '';
    await render(<DetailHarness budgetId="b1" onOpenMovement={(id) => (opened = id)} />, {
      wrapper: Providers,
    });

    await fireEvent.press(await screen.findByRole('button', { name: /Abrir movimiento/ }));

    expect(opened).toBe('m-1');
  });

  it('says so when no movement counts for the budget', async () => {
    makeRepository([budgetEndingIn('b1', 5)]);
    await render(<DetailHarness budgetId="b1" />, { wrapper: Providers });

    expect(await screen.findByText('Aún no hay movimientos para este presupuesto.')).toBeTruthy();
  });

  it('loads the movements in pages of 20', async () => {
    const many = Array.from({ length: 45 }, (_, i) =>
      line(String(i), 'EXPENSE', 100, { note: `Line ${i}` }),
    );
    makeRepository([budgetEndingIn('b1', 5)], { linesById: { b1: many } });
    await render(<DetailHarness budgetId="b1" />, { wrapper: Providers });

    expect(await screen.findAllByRole('button', { name: /Abrir movimiento/ })).toHaveLength(20);
    await fireEvent.press(screen.getByRole('button', { name: 'Ver más' }));
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /Abrir movimiento/ })).toHaveLength(40),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Ver más' }));
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /Abrir movimiento/ })).toHaveLength(45),
    );
    expect(screen.queryByRole('button', { name: 'Ver más' })).toBeNull();
  });

  it('RN-10 deleting asks first, then removes the budget from the lists', async () => {
    makeRepository([budgetEndingIn('b1', 5)]);
    let deleted = false;
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await render(
      <DetailHarness
        budgetId="b1"
        onDeleted={() => {
          deleted = true;
        }}
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

  it('says the budget no longer exists when it was deleted', async () => {
    makeRepository([budgetEndingIn('b1', 5, { deletedAt: '2026-11-01T00:00:00Z' })]);
    await render(<DetailHarness budgetId="b1" />, { wrapper: Providers });

    expect(await screen.findByText('Este presupuesto ya no existe.')).toBeTruthy();
  });
});

describe('who can edit (the "Editar" action of the header)', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <Providers>{children}</Providers>;

  it('RN-06 / RN-07 an active budget can be edited', async () => {
    makeRepository([budgetEndingIn('b1', 5)]);
    const { result } = await renderHook(() => useBudgetDetail('b1'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canEdit).toBe(true);
  });

  it('RN-07 / RN-08 one in grace or closed cannot', async () => {
    makeRepository([
      budgetEndingIn('grace', -2),
      budgetEndingIn('closed', -30, { status: 'CLOSED', spentFinalMinor: 0 }),
    ]);

    for (const id of ['grace', 'closed']) {
      const { result } = await renderHook(() => useBudgetDetail(id), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.canEdit).toBe(false);
    }
  });
});
