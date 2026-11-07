import type { ThemeMode } from '@/core/shared/app-preferences';

// Color tokens of the "Manila intenso" palette (.impeccable/surfaces/src-app.md).
// Screens read colors from the theme, never hard-coded hex values.
export type ResolvedScheme = 'light' | 'dark';

export type ThemeColors = {
  ground: string; // screen background
  surface: string; // cards and sheets
  line: string; // borders and dividers
  ink: string; // primary text
  mute: string; // secondary text
  manila: string; // brand: header, envelopes, primary action
  onManila: string; // text on top of manila
  over: string; // exceeded budget
  positive: string; // saved / ok
  link: string;
  categoryTints: readonly [string, string, string, string];
};

export const lightColors: ThemeColors = {
  ground: '#ECEEF1',
  surface: '#FFFFFF',
  line: '#D8DCE1',
  ink: '#14161A',
  mute: '#5C6570',
  manila: '#E3A21A',
  onManila: '#14161A',
  over: '#C8331B',
  positive: '#1E8A52',
  link: '#2558C9',
  categoryTints: ['#D9452A', '#2F66D8', '#23955E', '#7A4FD0'],
};

export const darkColors: ThemeColors = {
  ground: '#0E1013',
  surface: '#191C20',
  line: '#2A2F36',
  ink: '#F1F2F4',
  mute: '#9AA3AE',
  manila: '#F2B33D',
  onManila: '#14161A',
  over: '#FF7A5C',
  positive: '#4CC98A',
  link: '#7FA6FF',
  categoryTints: ['#FF7A5C', '#7FA6FF', '#4CC98A', '#A98BFF'],
};

export const colorsByScheme: Record<ResolvedScheme, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};

// SYSTEM follows the device; if the device gives no preference we use light.
export function resolveScheme(
  mode: ThemeMode,
  systemScheme: 'light' | 'dark' | null | undefined,
): ResolvedScheme {
  if (mode === 'LIGHT') return 'light';
  if (mode === 'DARK') return 'dark';
  return systemScheme === 'dark' ? 'dark' : 'light';
}
