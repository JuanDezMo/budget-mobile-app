import { z } from 'zod';

import type { PinLockState } from '@/core/shared/pin-lock-state';

// Where secrets are kept. On the phone it is expo-secure-store (Keychain / Keystore).
export interface SecretStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

// Hashing tools, injected so tests do not need native code.
export interface PinHasher {
  randomSalt(): string;
  digest(text: string): Promise<string>;
}

export interface PinVault {
  hasPin(): Promise<boolean>;
  setPin(pin: string): Promise<void>;
  verifyPin(pin: string): Promise<boolean>;
  readLockState(): Promise<PinLockState>;
  writeLockState(state: PinLockState): Promise<void>;
  // Removes the PIN and the failed-attempt counter (registration and "forgot PIN").
  clear(): Promise<void>;
}

// Key names may only use letters, numbers, ".", "-" and "_" (expo-secure-store).
const CREDENTIAL_KEY = 'pin_credential';
const LOCK_STATE_KEY = 'pin_lock_state';

const credentialSchema = z.object({ salt: z.string(), hash: z.string() });
const lockStateSchema = z.object({
  failedAttempts: z.number().int().min(0),
  lockedUntilMs: z.number().nullable(),
});

const NO_FAILURES: PinLockState = { failedAttempts: 0, lockedUntilMs: null };

// Compares without stopping at the first difference.
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);

  return difference === 0;
}

function parseJson(text: string | null): unknown {
  if (text === null) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

// RN-43: the PIN is never stored. We keep a random salt and the SHA-256 of salt + PIN.
// The real protection against guessing is the wait after failed attempts (RN-45) and the
// OS-encrypted storage; a 4-6 digit PIN is small by nature.
export function createPinVault(storage: SecretStorage, hasher: PinHasher): PinVault {
  const hashOf = (salt: string, pin: string) => hasher.digest(`${salt}:${pin}`);

  async function readCredential() {
    const parsed = credentialSchema.safeParse(parseJson(await storage.get(CREDENTIAL_KEY)));
    return parsed.success ? parsed.data : null;
  }

  return {
    async hasPin() {
      return (await readCredential()) !== null;
    },

    async setPin(pin) {
      const salt = hasher.randomSalt();
      const hash = await hashOf(salt, pin);
      await storage.set(CREDENTIAL_KEY, JSON.stringify({ salt, hash }));
    },

    async verifyPin(pin) {
      const credential = await readCredential();
      if (!credential) return false; // no PIN saved: nothing can unlock (use "forgot PIN")

      return sameText(await hashOf(credential.salt, pin), credential.hash);
    },

    async readLockState() {
      const parsed = lockStateSchema.safeParse(parseJson(await storage.get(LOCK_STATE_KEY)));
      return parsed.success ? parsed.data : NO_FAILURES;
    },

    async writeLockState(state) {
      await storage.set(LOCK_STATE_KEY, JSON.stringify(state));
    },

    async clear() {
      await storage.remove(CREDENTIAL_KEY);
      await storage.remove(LOCK_STATE_KEY);
    },
  };
}

// For tests of ViewModels and screens.
export function createInMemorySecretStorage(): SecretStorage {
  const values = new Map<string, string>();

  return {
    get: (key) => Promise.resolve(values.get(key) ?? null),
    set(key, value) {
      values.set(key, value);
      return Promise.resolve();
    },
    remove(key) {
      values.delete(key);
      return Promise.resolve();
    },
  };
}

// Not secure, only predictable: lets tests check behavior without native crypto.
export function createFakePinHasher(): PinHasher {
  let counter = 0;

  return {
    randomSalt: () => `salt${(counter += 1)}`,
    digest: (text) => Promise.resolve(`digest(${text})`),
  };
}
