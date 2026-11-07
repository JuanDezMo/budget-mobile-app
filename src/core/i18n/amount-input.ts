import type { AppLanguage } from '@/core/shared/app-preferences';

// Thousands separator while typing an amount. The form keeps the amount as plain text with a dot
// for the decimals ("1500000.5"): that is what the validation and saving understand. Only what is
// shown on screen is grouped ("1.500.000,5" in Spanish, "1,500,000.5" in English).
type Separators = { group: string; decimal: string };

const SEPARATORS: Record<AppLanguage, Separators> = {
  es: { group: '.', decimal: ',' },
  en: { group: ',', decimal: '.' },
};

// The plain text kept by the form: digits and at most one dot.
function toPlain(text: string): string {
  const digitsAndDots = text.replace(/[^\d.]/g, '');
  const firstDot = digitsAndDots.indexOf('.');
  if (firstDot === -1) return digitsAndDots;

  return `${digitsAndDots.slice(0, firstDot + 1)}${digitsAndDots.slice(firstDot + 1).replace(/\./g, '')}`;
}

// Plain text -> what the field shows. Keeps a trailing decimal separator so the user can go on typing.
export function formatAmountText(plain: string, language: AppLanguage): string {
  const { group, decimal } = SEPARATORS[language];
  const [integer = '', fraction] = plain.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, group);

  return fraction === undefined ? grouped : `${grouped}${decimal}${fraction}`;
}

// What the field shows after an edit -> plain text. `previousShown` is what was on screen before the
// edit; it tells whether the user just typed a separator (always a decimal point, because grouping
// separators are only ever written by us) or deleted one.
export function parseAmountInput(
  typed: string,
  previousShown: string,
  language: AppLanguage,
): string {
  const { group, decimal } = SEPARATORS[language];

  // A "," or "." added at the end is the decimal point, whatever the phone's keyboard offers.
  if (typed.length === previousShown.length + 1 && typed.startsWith(previousShown)) {
    const added = typed.slice(-1);
    if (added === ',' || added === '.') {
      const plain = toPlain(previousShown.split(group).join('').split(decimal).join('.'));
      return plain.includes('.') ? plain : `${plain}.`;
    }
  }

  // Deleting a grouping separator removes the digit before it (otherwise nothing would seem to happen).
  if (typed.length === previousShown.length - 1) {
    const index = [...previousShown].findIndex((char, i) => char !== typed[i]);
    if (
      index > 0 &&
      previousShown[index] === group &&
      previousShown.slice(0, index) + previousShown.slice(index + 1) === typed
    ) {
      return parseAmountInput(
        previousShown.slice(0, index - 1) + previousShown.slice(index + 1),
        previousShown,
        language,
      );
    }
  }

  return toPlain(typed.split(group).join('').split(decimal).join('.'));
}

// Props for an amount field: show the grouped text, give back the plain text.
export function amountInputProps(
  plain: string,
  onChangePlain: (plain: string) => void,
  language: AppLanguage,
) {
  const shown = formatAmountText(plain, language);

  return {
    value: shown,
    onChangeText: (typed: string) => onChangePlain(parseAmountInput(typed, shown, language)),
  };
}
