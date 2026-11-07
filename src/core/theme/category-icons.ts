// Icon key (stored in the database) -> emoji drawn on screen. Emojis need no icon font,
// which keeps the app light on low-end phones. The keys a user can choose are listed in
// categories/category.types.ts; an unknown key falls back to a question mark.
export const ICON_EMOJI: Readonly<Record<string, string>> = {
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
  return ICON_EMOJI[icon] ?? '❓';
}
