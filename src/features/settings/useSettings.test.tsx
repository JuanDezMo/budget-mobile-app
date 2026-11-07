import { beforeEach, describe, expect, it } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { getAppLanguage, initI18n } from '@/core/i18n/i18n';

import { createInMemorySettingsRepository } from './settings.repository';
import type { SettingsRepository } from './settings.repository';
import { loadSettings, useSettings, useSettingsStore } from './useSettings';
import { SettingsRepositoryProvider } from './useSettingsRepository';

function setup(repository: SettingsRepository) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SettingsRepositoryProvider value={repository}>{children}</SettingsRepositoryProvider>
  );

  return renderHook(() => useSettings(), { wrapper });
}

describe('useSettings', () => {
  beforeEach(async () => {
    useSettingsStore.setState({ settings: null });
    await initI18n('es');
  });

  it('RN-37 loadSettings creates the defaults from the device language', async () => {
    const repository = createInMemorySettingsRepository();

    const settings = await loadSettings(repository, 'en');

    expect(settings).toEqual({ language: 'en', theme: 'SYSTEM' });
    expect(useSettingsStore.getState().settings).toEqual(settings);
  });

  it('RN-37 changing the theme saves it and updates the state', async () => {
    const repository = createInMemorySettingsRepository();
    await loadSettings(repository, 'es');
    const { result } = await setup(repository);

    await act(async () => {
      await result.current.setTheme('DARK');
    });

    expect(result.current.settings?.theme).toBe('DARK');
    expect((await repository.get()).theme).toBe('DARK');
  });

  it('RN-37 changing the language saves it and switches the app texts', async () => {
    const repository = createInMemorySettingsRepository();
    await loadSettings(repository, 'es');
    const { result } = await setup(repository);

    await act(async () => {
      await result.current.setLanguage('en');
    });

    expect((await repository.get()).language).toBe('en');
    expect(getAppLanguage()).toBe('en');
  });

  it('returns an UNEXPECTED error instead of throwing when saving fails', async () => {
    const repository = createInMemorySettingsRepository(); // row never created: update fails
    const { result } = await setup(repository);

    let outcome;
    await act(async () => {
      outcome = await result.current.setTheme('LIGHT');
    });

    expect(outcome).toEqual({ ok: false, error: 'UNEXPECTED' });
  });
});
