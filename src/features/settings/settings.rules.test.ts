import { describe, expect, it } from '@jest/globals';

import { buildDefaultSettings } from './settings.rules';

describe('settings rules', () => {
  it('RN-37 first launch follows the device language when it is es or en', () => {
    expect(buildDefaultSettings('en')).toEqual({ language: 'en', theme: 'SYSTEM' });
    expect(buildDefaultSettings('es')).toEqual({ language: 'es', theme: 'SYSTEM' });
  });

  it('RN-37 first launch falls back to Spanish for any other language', () => {
    expect(buildDefaultSettings('fr').language).toBe('es');
    expect(buildDefaultSettings(undefined).language).toBe('es');
  });
});
