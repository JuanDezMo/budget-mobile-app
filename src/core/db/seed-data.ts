// Reference data every installation starts with (RN-32, RN-34).
// System categories use fixed ids so they are the same on every device
// (useful later for backup and sync). Names are not stored: the UI translates `code`.

export const SEED_CURRENCIES = [
  { code: 'COP', name: 'Colombian peso', decimals: 0 },
  { code: 'USD', name: 'US dollar', decimals: 2 },
  { code: 'EUR', name: 'Euro', decimals: 2 },
] as const;

export const SYSTEM_CATEGORY_CODES = [
  'ALIMENTACION',
  'TRANSPORTE',
  'ENTRETENIMIENTO',
  'URGENCIAS',
  'OBLIGACIONES_HOGAR',
  'SIN_CLASIFICAR',
] as const;

export type SystemCategoryCode = (typeof SYSTEM_CATEGORY_CODES)[number];

export const SEED_SYSTEM_CATEGORIES: readonly {
  id: string;
  code: SystemCategoryCode;
  icon: string;
  color: string;
}[] = [
  {
    id: '6f1b7a52-0c3e-4d58-9a41-1e2c0a7b0001',
    code: 'ALIMENTACION',
    icon: 'utensils',
    color: '#D9452A',
  },
  {
    id: '6f1b7a52-0c3e-4d58-9a41-1e2c0a7b0002',
    code: 'TRANSPORTE',
    icon: 'bus',
    color: '#2F66D8',
  },
  {
    id: '6f1b7a52-0c3e-4d58-9a41-1e2c0a7b0003',
    code: 'ENTRETENIMIENTO',
    icon: 'film',
    color: '#7A4FD0',
  },
  {
    id: '6f1b7a52-0c3e-4d58-9a41-1e2c0a7b0004',
    code: 'URGENCIAS',
    icon: 'siren',
    color: '#C8331B',
  },
  {
    id: '6f1b7a52-0c3e-4d58-9a41-1e2c0a7b0005',
    code: 'OBLIGACIONES_HOGAR',
    icon: 'home',
    color: '#23955E',
  },
  {
    id: '6f1b7a52-0c3e-4d58-9a41-1e2c0a7b0006',
    code: 'SIN_CLASIFICAR',
    icon: 'help-circle',
    color: '#5C6570',
  },
];
