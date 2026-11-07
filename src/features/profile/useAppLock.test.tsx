import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

import { useAccessStore, useAppLock } from './useAccess';

type Listener = (state: AppStateStatus) => void;

let listener: Listener | null = null;
let clock = 0;
const now = () => clock;

beforeEach(() => {
  listener = null;
  clock = 1_000_000;
  useAccessStore.setState({
    status: 'unlocked',
    profile: { fullName: 'Ana', email: 'ana@example.com', countryCode: 'CO' },
  });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    listener = handler;
    return { remove: () => undefined };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function sendToBackgroundAndBack(secondsAway: number) {
  listener?.('background');
  clock += secondsAway * 1000;
  listener?.('active');
}

describe('useAppLock', () => {
  it('RN-44 stays unlocked when the app returns in under 30 seconds', async () => {
    await renderHook(() => useAppLock(now));

    sendToBackgroundAndBack(10);

    expect(useAccessStore.getState().status).toBe('unlocked');
  });

  it('RN-44 locks when the app returns after 30 seconds or more', async () => {
    await renderHook(() => useAppLock(now));

    sendToBackgroundAndBack(30);

    expect(useAccessStore.getState().status).toBe('locked');
  });

  it('RN-44 does not lock when the app only went inactive (e.g. a system dialog)', async () => {
    await renderHook(() => useAppLock(now));

    listener?.('inactive');
    clock += 120_000;
    listener?.('active');

    expect(useAccessStore.getState().status).toBe('unlocked');
  });
});
