import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/index';

// In Jest, expo-constants does not read app.json, so expoConfig is empty.
// Feed it the real app.json so the test checks the actual configured name.
jest.mock('expo-constants', () => {
  const appJson = jest.requireActual<{ expo: { name: string } }>('../../app.json');
  return { __esModule: true, default: { expoConfig: appJson.expo } };
});

// Smoke test: proves the test toolchain (jest-expo, RNTL, @/ alias) works.
// Kept outside src/app because Expo Router treats every file there as a route.
describe('smoke', () => {
  it('renders the placeholder home screen with the app name', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('Adjusting My Money')).toBeTruthy();
  });
});
