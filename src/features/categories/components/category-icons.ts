import type { CategoryIconKey } from '../category.types';

// Icon key (stored in the database) -> emoji drawn on screen. Emojis need no icon font,
// which keeps the app light on low-end phones. Built-in categories use the first six keys.
export const ICON_EMOJI: Readonly<Record<CategoryIconKey, string>> = {
  utensils: '🍽️',
  bus: '🚌',
  film: '🎬',
  siren: '🚨',
  home: '🏠',
  'help-circle': '❓',
  paw: '🐾',
  heart: '❤️',
  shirt: '👕',
  book: '📚',
  gift: '🎁',
  plane: '✈️',
  wallet: '👛',
  phone: '📱',
  wrench: '🔧',
  star: '⭐',
};

export function iconToEmoji(icon: string): string {
  return icon in ICON_EMOJI ? ICON_EMOJI[icon as CategoryIconKey] : ICON_EMOJI['help-circle'];
}
