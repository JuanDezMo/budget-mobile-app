import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { router } from 'expo-router';

import SettingsScreen from '@/app/(tabs)/settings';
import { initI18n, setAppLanguage } from '@/core/i18n/i18n';
import { ThemeProvider } from '@/core/theme/ThemeProvider';
import { createInMemorySettingsRepository } from '@/features/settings/settings.repository';
import { loadSettings, useSettingsStore } from '@/features/settings/useSettings';
import { SettingsRepositoryProvider } from '@/features/settings/useSettingsRepository';

// Screen tests live here, not in src/app, because Expo Router treats every file there as a route.
async function renderSettings() {
  const repository = createInMemorySettingsRepository();
  await loadSettings(repository, 'es');
  await render(
    <SettingsRepositoryProvider value={repository}>
      <ThemeProvider mode="SYSTEM">
        <SettingsScreen />
      </ThemeProvider>
    </SettingsRepositoryProvider>,
  );

  return repository;
}

describe('settings screen', () => {
  beforeEach(async () => {
    useSettingsStore.setState({ settings: null });
    await initI18n('es');
    await setAppLanguage('es');
  });

  it('RN-37 shows the language and theme choices with the current ones selected', async () => {
    await renderSettings();

    expect(screen.getByText('Idioma')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Español', selected: true })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Sistema', selected: true })).toBeTruthy();
  });

  it('RN-37 choosing English saves it and translates the screen', async () => {
    const repository = await renderSettings();

    await act(async () => {
      fireEvent.press(screen.getByRole('radio', { name: 'Inglés' }));
    });

    expect((await repository.get()).language).toBe('en');
    expect(screen.getByText('Language')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'English', selected: true })).toBeTruthy();
  });

  it('RN-37 choosing the dark theme saves it', async () => {
    const repository = await renderSettings();

    await act(async () => {
      fireEvent.press(screen.getByRole('radio', { name: 'Oscuro' }));
    });

    expect((await repository.get()).theme).toBe('DARK');
    expect(screen.getByRole('radio', { name: 'Oscuro', selected: true })).toBeTruthy();
  });

  it('groups preferences and account; each account row opens its screen', async () => {
    const push = jest.spyOn(router, 'push').mockImplementation(() => undefined);
    await renderSettings();

    const headings = screen.getAllByRole('header');
    expect(headings).toHaveLength(2);
    expect(headings[0]).toHaveTextContent('PREFERENCIAS');
    expect(headings[1]).toHaveTextContent('TU CUENTA');

    await fireEvent.press(screen.getByRole('link', { name: 'Categorías' }));
    await fireEvent.press(screen.getByRole('link', { name: 'Perfil y seguridad' }));

    expect(push.mock.calls.map(([href]) => href)).toEqual(['/categories', '/profile']);
    push.mockRestore();
  });
});
