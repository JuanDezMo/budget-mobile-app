import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
} from '@expo-google-fonts/archivo';
import { ArchivoNarrow_700Bold } from '@expo-google-fonts/archivo-narrow';

// Typography of the visual direction (.impeccable/surfaces/src-app.md): Archivo for text, with
// tabular figures so amounts line up, and a condensed face for the big amounts.
// On the phone one font file = one weight, so the weight is part of the family name.
export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

export const FONT_FAMILY: Readonly<Record<TextWeight, string>> = {
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  extrabold: 'Archivo_800ExtraBold',
};

// Archivo Narrow stands in for Archivo's condensed width (a variable axis the phone cannot use).
export const CONDENSED_FAMILY = 'ArchivoNarrow_700Bold';

// The font files, ready for `Font.loadAsync` at startup.
export const FONT_FILES = {
  [FONT_FAMILY.regular]: Archivo_400Regular,
  [FONT_FAMILY.medium]: Archivo_500Medium,
  [FONT_FAMILY.semibold]: Archivo_600SemiBold,
  [FONT_FAMILY.bold]: Archivo_700Bold,
  [FONT_FAMILY.extrabold]: Archivo_800ExtraBold,
  [CONDENSED_FAMILY]: ArchivoNarrow_700Bold,
};
