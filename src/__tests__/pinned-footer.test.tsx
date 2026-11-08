import { describe, expect, it, jest } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import type { EmitterSubscription, KeyboardEventName } from 'react-native';
import { Keyboard, Text } from 'react-native';

import { PinnedFooter } from '@/core/theme/PinnedFooter';

describe('pinned footer', () => {
  it('steps aside while the keyboard is open, so it never covers the field being typed in', async () => {
    const listeners = new Map<KeyboardEventName, () => void>();
    const addListener = jest
      .spyOn(Keyboard, 'addListener')
      .mockImplementation((event, listener) => {
        listeners.set(event, () => listener({} as never));
        return { remove: () => undefined } as EmitterSubscription;
      });

    await render(
      <PinnedFooter>
        <Text>Save</Text>
      </PinnedFooter>,
    );
    expect(screen.getByText('Save')).toBeTruthy();

    await act(() => listeners.get('keyboardDidShow')?.());
    expect(screen.queryByText('Save')).toBeNull();

    await act(() => listeners.get('keyboardDidHide')?.());
    expect(screen.getByText('Save')).toBeTruthy();
    addListener.mockRestore();
  });
});
