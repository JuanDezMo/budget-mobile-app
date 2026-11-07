import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { createPinVault } from './pin-vault';
import type { PinHasher, PinVault, SecretStorage } from './pin-vault';

// Keychain (iOS) / Keystore (Android). THIS_DEVICE_ONLY: the PIN never migrates to another
// phone through a backup (docs/work-plan.md, findings of T1B.1).
const OPTIONS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

const secureStorage: SecretStorage = {
  get: (key) => SecureStore.getItemAsync(key, OPTIONS),
  set: (key, value) => SecureStore.setItemAsync(key, value, OPTIONS),
  remove: (key) => SecureStore.deleteItemAsync(key, OPTIONS),
};

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const hasher: PinHasher = {
  randomSalt: () => toHex(Crypto.getRandomBytes(16)),
  digest: (text) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text),
};

export function createDevicePinVault(): PinVault {
  return createPinVault(secureStorage, hasher);
}
