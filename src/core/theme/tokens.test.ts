import { describe, expect, it } from '@jest/globals';

import { isThemeMode } from '@/core/shared/app-preferences';

import { darkColors, lightColors, resolveScheme } from './tokens';

describe('theme', () => {
  it('RN-37 LIGHT and DARK ignore the system preference', () => {
    expect(resolveScheme('LIGHT', 'dark')).toBe('light');
    expect(resolveScheme('DARK', 'light')).toBe('dark');
  });

  it('RN-37 SYSTEM follows the device and falls back to light', () => {
    expect(resolveScheme('SYSTEM', 'dark')).toBe('dark');
    expect(resolveScheme('SYSTEM', 'light')).toBe('light');
    expect(resolveScheme('SYSTEM', null)).toBe('light');
  });

  it('only LIGHT, DARK and SYSTEM are theme modes', () => {
    expect(isThemeMode('SYSTEM')).toBe(true);
    expect(isThemeMode('AUTO')).toBe(false);
  });

  it('light and dark define the same tokens', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });
});
