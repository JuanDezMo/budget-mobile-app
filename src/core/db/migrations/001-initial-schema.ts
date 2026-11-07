import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Migration } from 'kysely/migration';

// Every statement is written as raw SQL with explicit STRICT so the schema is identical
// on the phone (expo-sqlite) and in Node tests (better-sqlite3). SQLite runs one statement
// per call, so the list is executed one by one.
const statements: readonly string[] = [
  `CREATE TABLE currency (
    code     TEXT PRIMARY KEY,
    name     TEXT NOT NULL,
    decimals INTEGER NOT NULL CHECK (decimals BETWEEN 0 AND 4)
  ) STRICT`,

  `CREATE TABLE category (
    id          TEXT PRIMARY KEY,
    code        TEXT UNIQUE,
    name        TEXT,
    icon        TEXT NOT NULL,
    color       TEXT NOT NULL,
    is_system   INTEGER NOT NULL CHECK (is_system IN (0, 1)),
    archived_at TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    CHECK (
      (is_system = 1 AND code IS NOT NULL AND name IS NULL) OR
      (is_system = 0 AND code IS NULL AND name IS NOT NULL)
    )
  ) STRICT`,
  `CREATE UNIQUE INDEX ux_category_name ON category (lower(name)) WHERE name IS NOT NULL`,

  `CREATE TABLE budget (
    id                TEXT PRIMARY KEY,
    category_id       TEXT NOT NULL REFERENCES category (id),
    currency_code     TEXT NOT NULL REFERENCES currency (code),
    amount_minor      INTEGER NOT NULL CHECK (amount_minor > 0),
    start_date        TEXT NOT NULL,
    end_date          TEXT NOT NULL,
    status            TEXT NOT NULL CHECK (status IN ('ACTIVE', 'CLOSED')),
    spent_final_minor INTEGER,
    closed_at         TEXT,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL,
    deleted_at        TEXT,
    CHECK (start_date <= end_date)
  ) STRICT`,
  `CREATE INDEX ix_budget_cat_dates ON budget (category_id, start_date, end_date)`,

  `CREATE TABLE budget_threshold (
    id           TEXT PRIMARY KEY,
    budget_id    TEXT NOT NULL REFERENCES budget (id),
    percentage   INTEGER NOT NULL CHECK (percentage BETWEEN 1 AND 100),
    is_automatic INTEGER NOT NULL CHECK (is_automatic IN (0, 1))
  ) STRICT`,
  `CREATE UNIQUE INDEX ux_threshold ON budget_threshold (budget_id, percentage)`,

  `CREATE TABLE alert_sent (
    id           TEXT PRIMARY KEY,
    threshold_id TEXT NOT NULL REFERENCES budget_threshold (id) ON DELETE CASCADE,
    sent_at      TEXT NOT NULL
  ) STRICT`,
  `CREATE UNIQUE INDEX ux_alert ON alert_sent (threshold_id)`,

  `CREATE TABLE movement (
    id             TEXT PRIMARY KEY,
    kind           TEXT NOT NULL CHECK (kind IN ('EXPENSE', 'REFUND', 'INCOME')),
    currency_code  TEXT NOT NULL REFERENCES currency (code),
    total_minor    INTEGER NOT NULL CHECK (total_minor > 0),
    occurred_at    TEXT NOT NULL,
    local_date     TEXT NOT NULL,
    payment_method TEXT NOT NULL
      CHECK (payment_method IN ('CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'TRANSFER', 'OTHER')),
    note           TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    deleted_at     TEXT
  ) STRICT`,
  `CREATE INDEX ix_movement_local_date ON movement (local_date)`,

  `CREATE TABLE movement_line (
    id           TEXT PRIMARY KEY,
    movement_id  TEXT NOT NULL REFERENCES movement (id),
    category_id  TEXT NOT NULL REFERENCES category (id),
    budget_id    TEXT REFERENCES budget (id),
    amount_minor INTEGER NOT NULL CHECK (amount_minor > 0)
  ) STRICT`,
  `CREATE INDEX ix_line_movement ON movement_line (movement_id)`,
  `CREATE INDEX ix_line_category ON movement_line (category_id)`,
  `CREATE INDEX ix_line_budget ON movement_line (budget_id)`,

  `CREATE TABLE settings (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    language   TEXT NOT NULL CHECK (language IN ('es', 'en')),
    theme      TEXT NOT NULL CHECK (theme IN ('LIGHT', 'DARK', 'SYSTEM')),
    updated_at TEXT NOT NULL
  ) STRICT`,

  `CREATE TABLE user_profile (
    id           INTEGER PRIMARY KEY CHECK (id = 1),
    full_name    TEXT NOT NULL CHECK (length(trim(full_name)) > 0),
    email        TEXT NOT NULL CHECK (length(trim(email)) > 0),
    country_code TEXT NOT NULL CHECK (length(country_code) = 2),
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  ) STRICT`,
];

export const initialSchema: Migration = {
  async up(db: Kysely<unknown>) {
    for (const statement of statements) {
      await sql.raw(statement).execute(db);
    }
  },
};
