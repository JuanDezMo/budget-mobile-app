import { beforeEach, describe, expect, it } from '@jest/globals';

import { initI18n, setAppLanguage } from '@/core/i18n/i18n';

import {
  createAlertDispatcher,
  dismissInAppAlert,
  setUpNotificationPermission,
  useInAppAlertsStore,
} from './in-app-alerts';
import { buildBudgetAlertMessage } from './messages';
import { createFakeNotifier } from './notifier';

const message = { title: 'Budget: Fun', body: 'You have used 50%' };

beforeEach(async () => {
  useInAppAlertsStore.setState({ alerts: [], permission: 'undetermined' });
  await initI18n('es');
  await setAppLanguage('es');
});

describe('alert delivery', () => {
  it('with permission the alert goes to the system and not to the banner', async () => {
    const fake = createFakeNotifier('granted');

    const where = await createAlertDispatcher(fake.notifier)(message);

    expect(where).toBe('system');
    expect(fake.shown).toEqual([message]);
    expect(useInAppAlertsStore.getState().alerts).toEqual([]);
  });

  it('RN-31 without permission the alert appears as a banner inside the app', async () => {
    const fake = createFakeNotifier('denied');

    const where = await createAlertDispatcher(fake.notifier)(message);

    expect(where).toBe('banner');
    expect(fake.shown).toEqual([]);
    expect(useInAppAlertsStore.getState().alerts).toMatchObject([message]);
  });

  it('RN-31 if the permission was never answered, the alert is not lost either', async () => {
    const fake = createFakeNotifier('undetermined');

    expect(await createAlertDispatcher(fake.notifier)(message)).toBe('banner');
  });

  it('RN-31 if the system fails to show it, it falls back to the banner', async () => {
    const fake = createFakeNotifier('granted', true);

    expect(await createAlertDispatcher(fake.notifier)(message)).toBe('banner');
    expect(useInAppAlertsStore.getState().alerts).toHaveLength(1);
  });

  it('banner alerts can be dismissed one by one', async () => {
    const dispatch = createAlertDispatcher(createFakeNotifier('denied').notifier);
    await dispatch(message);
    await dispatch({ title: 'Other', body: 'x' });
    const [first] = useInAppAlertsStore.getState().alerts;

    dismissInAppAlert(first?.id ?? -1);

    expect(useInAppAlertsStore.getState().alerts.map((alert) => alert.title)).toEqual(['Other']);
  });
});

describe('notification permission', () => {
  it('asks once when it was never answered, and remembers the answer', async () => {
    const fake = createFakeNotifier('undetermined');
    fake.answerRequestWith('granted');

    expect(await setUpNotificationPermission(fake.notifier)).toBe('granted');
    expect(fake.requests).toBe(1);
    expect(useInAppAlertsStore.getState().permission).toBe('granted');
  });

  it('RN-31 a refusal is kept, and the app does not ask again', async () => {
    const fake = createFakeNotifier('undetermined');
    fake.answerRequestWith('denied');

    await setUpNotificationPermission(fake.notifier);
    await setUpNotificationPermission(fake.notifier);

    expect(useInAppAlertsStore.getState().permission).toBe('denied');
    expect(fake.requests).toBe(1);
  });

  it('does not ask when it is already granted or denied', async () => {
    const granted = createFakeNotifier('granted');
    const denied = createFakeNotifier('denied');

    await setUpNotificationPermission(granted.notifier);
    await setUpNotificationPermission(denied.notifier);

    expect(granted.requests + denied.requests).toBe(0);
  });
});

describe('alert text', () => {
  const base = { categoryLabel: 'Entretenimiento', currency: 'USD' as const, availableMinor: 5500 };

  it('says the percentage reached, with the amounts, in Spanish', () => {
    const text = buildBudgetAlertMessage({ ...base, threshold: 50, spentMinor: 3000 });

    expect(text.title).toBe('Presupuesto: Entretenimiento');
    expect(text.body).toMatch(/Llevas el 50 % de tu presupuesto \(USD\s30,00 de USD\s55,00\)\./);
  });

  it('the 100% alert says the whole budget was used, or that it was passed', () => {
    expect(buildBudgetAlertMessage({ ...base, threshold: 100, spentMinor: 5500 }).body).toMatch(
      /Usaste todo el presupuesto/,
    );
    expect(buildBudgetAlertMessage({ ...base, threshold: 100, spentMinor: 5600 }).body).toMatch(
      /Te pasaste de tu presupuesto/,
    );
  });

  it('is written in the language the app has when it is sent', async () => {
    await setAppLanguage('en');

    const text = buildBudgetAlertMessage({ ...base, threshold: 90, spentMinor: 5000 });

    expect(text.title).toBe('Budget: Entretenimiento');
    expect(text.body).toMatch(/You have used 90% of your budget/);
  });
});
