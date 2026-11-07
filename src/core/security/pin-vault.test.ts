import { beforeEach, describe, expect, it } from '@jest/globals';

import { createFakePinHasher, createInMemorySecretStorage, createPinVault } from './pin-vault';
import type { PinVault, SecretStorage } from './pin-vault';

let storage: SecretStorage;
let vault: PinVault;

beforeEach(() => {
  storage = createInMemorySecretStorage();
  vault = createPinVault(storage, createFakePinHasher());
});

describe('PIN vault', () => {
  it('RN-43 has no PIN until one is set', async () => {
    expect(await vault.hasPin()).toBe(false);
    expect(await vault.verifyPin('1234')).toBe(false);
  });

  it('RN-43 accepts the right PIN and rejects a wrong one', async () => {
    await vault.setPin('1234');

    expect(await vault.hasPin()).toBe(true);
    expect(await vault.verifyPin('1234')).toBe(true);
    expect(await vault.verifyPin('1235')).toBe(false);
  });

  it('RN-43 never stores the PIN in plain text', async () => {
    await vault.setPin('4821');

    const stored = (await storage.get('pin_credential')) ?? '';
    expect(stored).not.toContain('4821,');
    expect(stored).toContain('salt1');
    expect(stored).toContain('hash');
  });

  it('RN-47 setting a new PIN replaces the old one', async () => {
    await vault.setPin('1234');
    await vault.setPin('5678');

    expect(await vault.verifyPin('1234')).toBe(false);
    expect(await vault.verifyPin('5678')).toBe(true);
  });

  it('RN-45 keeps the failed-attempt counter between sessions', async () => {
    await vault.writeLockState({ failedAttempts: 5, lockedUntilMs: 99 });

    const reopened = createPinVault(storage, createFakePinHasher());
    expect(await reopened.readLockState()).toEqual({ failedAttempts: 5, lockedUntilMs: 99 });
  });

  it('RN-45 starts with no failed attempts, even if stored data is corrupt', async () => {
    expect(await vault.readLockState()).toEqual({ failedAttempts: 0, lockedUntilMs: null });

    await storage.set('pin_lock_state', 'not json');
    expect(await vault.readLockState()).toEqual({ failedAttempts: 0, lockedUntilMs: null });
  });

  it('RN-46 clear removes the PIN and the counter', async () => {
    await vault.setPin('1234');
    await vault.writeLockState({ failedAttempts: 3, lockedUntilMs: null });

    await vault.clear();

    expect(await vault.hasPin()).toBe(false);
    expect(await vault.readLockState()).toEqual({ failedAttempts: 0, lockedUntilMs: null });
  });
});
