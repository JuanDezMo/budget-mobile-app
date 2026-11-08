import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { initI18n, setAppLanguage } from '@/core/i18n/i18n';
import { ThemeProvider } from '@/core/theme/ThemeProvider';
import { createInMemoryThresholdRepository } from '@/features/alerts/alert.repository';
import type { ThresholdRepository } from '@/features/alerts/alert.repository';
import { ThresholdEditor } from '@/features/alerts/components/ThresholdEditor';
import {
  AlertActionsProvider,
  ThresholdRepositoryProvider,
} from '@/features/alerts/useAlertDependencies';
import { useThresholdDraft } from '@/features/alerts/useThresholdDraft';
import type { ThresholdDraft } from '@/features/alerts/useThresholdDraft';

// Screen tests live here, not in src/app, because Expo Router treats every file there as a route.
let repository: ThresholdRepository;
let sync: jest.Mock<(budgetId: string) => Promise<void>>;
let draft: ThresholdDraft | null;

function Harness({ budgetId }: { budgetId?: string }) {
  const current = useThresholdDraft({ budgetId });
  // Keeps the latest draft so tests can read it and call save (set after render, not during it).
  useEffect(() => {
    draft = current;
  });

  return <ThresholdEditor draft={current} />;
}

function Providers({ children }: { children: ReactNode }) {
  return (
    <ThresholdRepositoryProvider value={repository}>
      <AlertActionsProvider value={{ syncAfterThresholdEdit: sync }}>
        <ThemeProvider mode="LIGHT">{children}</ThemeProvider>
      </AlertActionsProvider>
    </ThresholdRepositoryProvider>
  );
}

beforeEach(async () => {
  let n = 0;
  repository = createInMemoryThresholdRepository(() => `t-${(n += 1)}`);
  sync = jest.fn((_budgetId: string) => Promise.resolve());
  draft = null;
  await initI18n('es');
  await setAppLanguage('es');
});

describe('threshold editor', () => {
  it('RN-25 always says the 100% alert is on', async () => {
    await render(<Harness />, { wrapper: Providers });

    expect(screen.getByText('Siempre se te avisa al 100 %.')).toBeTruthy();
  });

  it('RN-24 lets the user add up to 3 alerts, and then hides the button', async () => {
    await render(<Harness />, { wrapper: Providers });

    for (let i = 0; i < 3; i += 1) {
      await fireEvent.press(screen.getByRole('button', { name: 'Agregar alerta' }));
    }

    expect(screen.getAllByLabelText(/Avisar al \(%\)/)).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Agregar alerta' })).toBeNull();
  });

  it('removes one alert', async () => {
    await render(<Harness />, { wrapper: Providers });
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar alerta' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar alerta' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Quitar alerta 1' }));

    expect(screen.getAllByLabelText(/Avisar al \(%\)/)).toHaveLength(1);
  });

  it('RN-24 flags text that is not a whole number from 1 to 99', async () => {
    await render(<Harness />, { wrapper: Providers });
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar alerta' }));

    await fireEvent.changeText(screen.getByLabelText('Avisar al (%) 1'), '5.5');

    expect(await screen.findByText('Usa números enteros del 1 al 99.')).toBeTruthy();
    expect(draft?.isValid).toBe(false);
  });

  it('RN-24 flags a repeated alert', async () => {
    await render(<Harness />, { wrapper: Providers });
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar alerta' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar alerta' }));

    await fireEvent.changeText(screen.getByLabelText('Avisar al (%) 1'), '50');
    await fireEvent.changeText(screen.getByLabelText('Avisar al (%) 2'), '50');

    expect(await screen.findByText('No puedes repetir una alerta.')).toBeTruthy();
  });

  it('RN-25 the 100% cannot be chosen again', async () => {
    await render(<Harness />, { wrapper: Providers });
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar alerta' }));

    await fireEvent.changeText(screen.getByLabelText('Avisar al (%) 1'), '100');

    expect(await screen.findByText(/La alerta del 100 % siempre está activa/)).toBeTruthy();
  });

  it('hands the valid percentages to the envelope preview, leaving out what is not valid yet', async () => {
    await render(<Harness />, { wrapper: Providers });
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar alerta' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar alerta' }));

    await fireEvent.changeText(screen.getByLabelText('Avisar al (%) 1'), '50');
    await fireEvent.changeText(screen.getByLabelText('Avisar al (%) 2'), 'abc');

    await waitFor(() => expect(draft?.percentages).toEqual([50]));
  });

  it('an empty box is simply not used', async () => {
    await render(<Harness />, { wrapper: Providers });
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar alerta' }));

    expect(draft?.isValid).toBe(true);
  });
});

describe('saving the thresholds', () => {
  it('RN-24 / RN-25 saves 50 and 90 with the automatic 100%, and brings the records up to date', async () => {
    await render(<Harness />, { wrapper: Providers });
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar alerta' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar alerta' }));
    await fireEvent.changeText(screen.getByLabelText('Avisar al (%) 1'), '90');
    await fireEvent.changeText(screen.getByLabelText('Avisar al (%) 2'), '50');

    const result = await draft?.save('b1');

    expect(result).toEqual({ ok: true, value: undefined });
    expect((await repository.list('b1')).map((t) => [t.percentage, t.isAutomatic])).toEqual([
      [50, false],
      [90, false],
      [100, true],
    ]);
    expect(sync).toHaveBeenCalledWith('b1');
  });

  it('does not save anything while the thresholds are invalid', async () => {
    await render(<Harness />, { wrapper: Providers });
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar alerta' }));
    await fireEvent.changeText(screen.getByLabelText('Avisar al (%) 1'), 'abc');

    const result = await draft?.save('b1');

    expect(result).toEqual({ ok: false, error: 'THRESHOLD_INVALID' });
    expect(await repository.list('b1')).toEqual([]);
    expect(sync).not.toHaveBeenCalled();
  });

  it('with no alerts chosen it still creates the automatic 100%', async () => {
    await render(<Harness />, { wrapper: Providers });

    await draft?.save('b1');

    expect((await repository.list('b1')).map((t) => t.percentage)).toEqual([100]);
  });

  it('editing a budget shows the alerts it already has, without the automatic one', async () => {
    await repository.ensureAutomatic('b1');
    await repository.replaceConfigurable('b1', [50, 90]);

    await render(<Harness budgetId="b1" />, { wrapper: Providers });

    await waitFor(() => expect(screen.getAllByLabelText(/Avisar al \(%\)/)).toHaveLength(2));
    expect(screen.getByLabelText('Avisar al (%) 1').props.value).toBe('50');
    expect(screen.getByLabelText('Avisar al (%) 2').props.value).toBe('90');
  });

  it('editing: removing an alert and saving deletes it', async () => {
    await repository.replaceConfigurable('b1', [50, 90]);
    await render(<Harness budgetId="b1" />, { wrapper: Providers });
    await waitFor(() => expect(screen.getAllByLabelText(/Avisar al \(%\)/)).toHaveLength(2));

    await fireEvent.press(screen.getByRole('button', { name: 'Quitar alerta 1' }));
    await draft?.save('b1');

    expect(
      (await repository.list('b1')).filter((t) => !t.isAutomatic).map((t) => t.percentage),
    ).toEqual([90]);
  });

  it('reports an unexpected failure instead of throwing', async () => {
    repository.replaceConfigurable = () => Promise.reject(new Error('disk full'));
    await render(<Harness />, { wrapper: Providers });

    expect(await draft?.save('b1')).toEqual({ ok: false, error: 'UNEXPECTED' });
  });
});
