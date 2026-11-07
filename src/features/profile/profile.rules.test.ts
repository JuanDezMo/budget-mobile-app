import { describe, expect, it } from '@jest/globals';

import {
  INITIAL_PIN_LOCK_STATE,
  lockRemainingSeconds,
  registerPinAttempt,
  shouldLockAfterBackground,
} from './profile.rules';
import { changePinSchema, pinSchema, profileSchema, registrationSchema } from './profile.schemas';
import type { PinLockState } from '@/core/shared/pin-lock-state';

const NOW = 1_000_000;

function failTimes(times: number): PinLockState {
  let state = INITIAL_PIN_LOCK_STATE;
  for (let i = 0; i < times; i += 1) state = registerPinAttempt(state, false, NOW);
  return state;
}

const validRegistration = {
  fullName: 'Ana Pérez',
  email: 'ana@example.com',
  countryCode: 'CO',
  pin: '1234',
  pinConfirmation: '1234',
};

describe('RN-42 registration', () => {
  it('RN-42 accepts a complete registration', () => {
    expect(registrationSchema.safeParse(validRegistration).success).toBe(true);
  });

  it('RN-42 requires a name, trimmed and not empty', () => {
    const result = profileSchema.safeParse({ ...validRegistration, fullName: '   ' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('FULL_NAME_REQUIRED');
  });

  it('RN-42 requires an email with a valid format', () => {
    for (const email of ['', 'ana', 'ana@', 'ana@example']) {
      const result = profileSchema.safeParse({ ...validRegistration, email });
      expect(result.success).toBe(false);
    }
    expect(
      profileSchema.safeParse({ ...validRegistration, email: ' ana@example.com ' }).success,
    ).toBe(true);
  });

  it('RN-42 requires an ISO country code', () => {
    expect(profileSchema.safeParse({ ...validRegistration, countryCode: 'ZZ' }).success).toBe(
      false,
    );
    expect(profileSchema.safeParse({ ...validRegistration, countryCode: 'Colombia' }).success).toBe(
      false,
    );
    expect(profileSchema.safeParse({ ...validRegistration, countryCode: 'US' }).success).toBe(true);
  });
});

describe('RN-43 PIN format', () => {
  it('RN-43 accepts 4 to 6 digits only', () => {
    for (const pin of ['1234', '12345', '123456', '0000'])
      expect(pinSchema.safeParse(pin).success).toBe(true);
    for (const pin of ['123', '1234567', '12a4', '', '12 34'])
      expect(pinSchema.safeParse(pin).success).toBe(false);
  });

  it('RN-43 registration needs the PIN confirmed twice', () => {
    const result = registrationSchema.safeParse({ ...validRegistration, pinConfirmation: '9999' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('PIN_MISMATCH');
  });

  it('RN-47 changing the PIN needs the current one and a confirmed new one', () => {
    expect(
      changePinSchema.safeParse({ currentPin: '1234', newPin: '5678', confirmation: '5678' })
        .success,
    ).toBe(true);
    expect(
      changePinSchema.safeParse({ currentPin: '', newPin: '5678', confirmation: '5678' }).success,
    ).toBe(false);
    expect(
      changePinSchema.safeParse({ currentPin: '1234', newPin: '5678', confirmation: '0000' })
        .success,
    ).toBe(false);
  });
});

describe('RN-45 failed attempts', () => {
  it('RN-45 the first 4 wrong PINs do not lock', () => {
    const state = failTimes(4);

    expect(state).toEqual({ failedAttempts: 4, lockedUntilMs: null });
    expect(lockRemainingSeconds(state, NOW)).toBe(0);
  });

  it('RN-45 the 5th wrong PIN locks for 30 seconds', () => {
    const state = failTimes(5);

    expect(lockRemainingSeconds(state, NOW)).toBe(30);
    expect(lockRemainingSeconds(state, NOW + 29_500)).toBe(1);
    expect(lockRemainingSeconds(state, NOW + 30_000)).toBe(0);
  });

  it('RN-45 the wait doubles with each further failure', () => {
    expect(lockRemainingSeconds(failTimes(6), NOW)).toBe(60);
    expect(lockRemainingSeconds(failTimes(7), NOW)).toBe(120);
  });

  it('RN-45 the wait never passes 15 minutes', () => {
    expect(lockRemainingSeconds(failTimes(30), NOW)).toBe(900);
  });

  it('RN-45 a correct PIN resets the counter', () => {
    expect(registerPinAttempt(failTimes(7), true, NOW)).toEqual(INITIAL_PIN_LOCK_STATE);
  });
});

describe('RN-44 lock after background', () => {
  it('RN-44 locks after 30 seconds away, not before', () => {
    expect(shouldLockAfterBackground(NOW, NOW + 29_999)).toBe(false);
    expect(shouldLockAfterBackground(NOW, NOW + 30_000)).toBe(true);
    expect(shouldLockAfterBackground(NOW, NOW + 600_000)).toBe(true);
  });
});
