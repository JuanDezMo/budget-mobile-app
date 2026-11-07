import type { Kysely } from 'kysely';

// Row shapes exactly as they are stored (snake_case). Only repositories read these;
// their mappers convert rows to the camelCase entities of each feature.
// Booleans are stored as 0/1 and dates as text (see docs/data-model.md).

export interface CurrencyTable {
  code: string;
  name: string;
  decimals: number;
}

export interface CategoryTable {
  id: string;
  code: string | null; // system categories only
  name: string | null; // custom categories only
  icon: string;
  color: string;
  is_system: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetTable {
  id: string;
  category_id: string;
  currency_code: string;
  amount_minor: number;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'CLOSED';
  spent_final_minor: number | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BudgetThresholdTable {
  id: string;
  budget_id: string;
  percentage: number;
  is_automatic: number;
}

export interface AlertSentTable {
  id: string;
  threshold_id: string;
  sent_at: string;
}

export interface MovementTable {
  id: string;
  kind: 'EXPENSE' | 'REFUND' | 'INCOME';
  currency_code: string;
  total_minor: number;
  occurred_at: string;
  local_date: string;
  payment_method: 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'TRANSFER' | 'OTHER';
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MovementLineTable {
  id: string;
  movement_id: string;
  category_id: string;
  budget_id: string | null;
  amount_minor: number;
}

export interface SettingsTable {
  id: number; // always 1
  language: 'es' | 'en';
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  updated_at: string;
}

export interface UserProfileTable {
  id: number; // always 1
  full_name: string;
  email: string;
  country_code: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  currency: CurrencyTable;
  category: CategoryTable;
  budget: BudgetTable;
  budget_threshold: BudgetThresholdTable;
  alert_sent: AlertSentTable;
  movement: MovementTable;
  movement_line: MovementLineTable;
  settings: SettingsTable;
  user_profile: UserProfileTable;
}

export type AppDatabase = Kysely<Database>;
