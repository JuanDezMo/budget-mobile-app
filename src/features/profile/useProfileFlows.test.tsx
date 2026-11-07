import { beforeEach, describe, expect, it } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  createFakePinHasher,
  createInMemorySecretStorage,
  createPinVault,
} from '@/core/security/pin-vault';
import type { PinVault } from '@/core/security/pin-vault';

import { createInMemoryProfileRepository } from './profile.repository';
import type { ProfileRepository } from './profile.repository';
import type { Profile } from './profile.types';
import { loadAccess, useAccessStore } from './useAccess';
import { useProfileSettings } from './useProfileSettings';
import { PinVaultProvider, ProfileRepositoryProvider } from './useProfileDependencies';
import { useRegistration } from './useRegistration';
import { useUnlock } from './useUnlock';

const ana: Profile = { fullName: 'Ana Pérez', email: 'ana@example.com', countryCode: 'CO' };
const registration = { ...ana, pin: '1234', pinConfirmation: '1234' };

let repository: ProfileRepository;
let vault: PinVault;
let clock: number;
const now = () => clock;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ProfileRepositoryProvider value={repository}>
      <PinVaultProvider value={vault}>{children}</PinVaultProvider>
    </ProfileRepositoryProvider>
  );
}

beforeEach(() => {
  repository = createInMemoryProfileRepository();
  vault = createPinVault(createInMemorySecretStorage(), createFakePinHasher());
  clock = 1_000_000;
  useAccessStore.setState({ status: 'loading', profile: null });
});

async function registerAna() {
  const { result } = await renderHook(() => useRegistration(), { wrapper });
  await act(async () => {
    await result.current.register(registration);
  });
}

describe('RN-42 / RN-43 registration', () => {
  it('RN-42 with no profile the app starts at registration', async () => {
    await loadAccess(repository);

    expect(useAccessStore.getState().status).toBe('needsRegistration');
  });

  it('RN-42 registering saves the profile and the PIN and opens the app', async () => {
    await registerAna();

    expect(await repository.get()).toEqual(ana);
    expect(await vault.verifyPin('1234')).toBe(true);
    expect(useAccessStore.getState().status).toBe('unlocked');
  });

  it('RN-42 rejects an invalid registration without saving anything', async () => {
    const { result } = await renderHook(() => useRegistration(), { wrapper });
    let outcome;
    await act(async () => {
      outcome = await result.current.register({ ...registration, email: 'nope' });
    });

    expect(outcome).toEqual({ ok: false, error: 'INVALID' });
    expect(await repository.get()).toBeNull();
    expect(await vault.hasPin()).toBe(false);
  });

  it('RN-43 discards a PIN left over from a previous install', async () => {
    await vault.setPin('9999');
    await vault.writeLockState({ failedAttempts: 4, lockedUntilMs: null });

    await registerAna();

    expect(await vault.verifyPin('9999')).toBe(false);
    expect(await vault.readLockState()).toEqual({ failedAttempts: 0, lockedUntilMs: null });
  });

  it('RN-43 does not keep a PIN when saving the profile fails', async () => {
    repository.create = () => Promise.reject(new Error('disk full'));
    const { result } = await renderHook(() => useRegistration(), { wrapper });
    let outcome;
    await act(async () => {
      outcome = await result.current.register(registration);
    });

    expect(outcome).toEqual({ ok: false, error: 'UNEXPECTED' });
    expect(await vault.hasPin()).toBe(false);
  });
});

describe('RN-44 / RN-45 / RN-46 lock screen', () => {
  beforeEach(async () => {
    await registerAna();
    useAccessStore.setState({ status: 'locked' });
  });

  it('RN-44 starts locked when a profile exists', async () => {
    useAccessStore.setState({ status: 'loading', profile: null });
    await loadAccess(repository);

    expect(useAccessStore.getState().status).toBe('locked');
  });

  it('RN-44 the right PIN opens the app', async () => {
    const { result } = await renderHook(() => useUnlock(now), { wrapper });
    await act(async () => {
      await result.current.unlock('1234');
    });

    expect(useAccessStore.getState().status).toBe('unlocked');
  });

  it('RN-45 a wrong PIN keeps the app locked', async () => {
    const { result } = await renderHook(() => useUnlock(now), { wrapper });
    let outcome;
    await act(async () => {
      outcome = await result.current.unlock('0000');
    });

    expect(outcome).toEqual({ ok: false, error: 'PIN_WRONG' });
    expect(useAccessStore.getState().status).toBe('locked');
  });

  it('RN-45 after 5 wrong PINs even the right PIN is refused until the wait ends', async () => {
    const { result } = await renderHook(() => useUnlock(now), { wrapper });
    for (let i = 0; i < 5; i += 1) {
      await act(async () => {
        await result.current.unlock('0000');
      });
    }
    let outcome;
    await act(async () => {
      outcome = await result.current.unlock('1234');
    });

    expect(outcome).toEqual({ ok: false, error: 'PIN_LOCKED' });
    expect(result.current.waitSeconds).toBe(30);
    expect(useAccessStore.getState().status).toBe('locked');

    clock += 31_000;
    await act(async () => {
      await result.current.unlock('1234');
    });
    expect(useAccessStore.getState().status).toBe('unlocked');
  });

  it('RN-46 "forgot my PIN" erases the data and goes back to registration', async () => {
    const { result } = await renderHook(() => useUnlock(now), { wrapper });
    await act(async () => {
      await result.current.eraseEverything();
    });

    expect(await repository.get()).toBeNull();
    expect(await vault.hasPin()).toBe(false);
    expect(useAccessStore.getState().status).toBe('needsRegistration');
  });
});

describe('RN-47 edit profile and PIN', () => {
  beforeEach(async () => {
    await registerAna();
  });

  it('RN-47 editing the profile needs the current PIN', async () => {
    const { result } = await renderHook(() => useProfileSettings(now), { wrapper });
    let wrong;
    let right;
    await act(async () => {
      wrong = await result.current.updateProfile({ countryCode: 'US' }, '0000');
    });
    expect(wrong).toEqual({ ok: false, error: 'PIN_WRONG' });
    expect((await repository.get())?.countryCode).toBe('CO');

    await act(async () => {
      right = await result.current.updateProfile({ countryCode: 'US' }, '1234');
    });
    expect(right).toEqual({ ok: true, value: undefined });
    expect((await repository.get())?.countryCode).toBe('US');
    expect(useAccessStore.getState().profile?.countryCode).toBe('US');
  });

  it('RN-47 changing the PIN needs the current PIN and replaces it', async () => {
    const { result } = await renderHook(() => useProfileSettings(now), { wrapper });
    await act(async () => {
      await result.current.changePin({ currentPin: '0000', newPin: '5678', confirmation: '5678' });
    });
    expect(await vault.verifyPin('1234')).toBe(true);

    await act(async () => {
      await result.current.changePin({ currentPin: '1234', newPin: '5678', confirmation: '5678' });
    });
    expect(await vault.verifyPin('5678')).toBe(true);
    expect(await vault.verifyPin('1234')).toBe(false);
  });

  it('RN-45 wrong PINs in Settings count toward the same wait', async () => {
    const { result } = await renderHook(() => useProfileSettings(now), { wrapper });
    for (let i = 0; i < 5; i += 1) {
      await act(async () => {
        await result.current.updateProfile({ fullName: 'X' }, '0000');
      });
    }
    let outcome;
    await act(async () => {
      outcome = await result.current.updateProfile({ fullName: 'X' }, '1234');
    });

    expect(outcome).toEqual({ ok: false, error: 'PIN_LOCKED' });
  });
});
