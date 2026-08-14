-- src/card-service/migrations/000001_init_schema.up.sql
-- Card Management Service Schema (cards_db)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    account_id      UUID NOT NULL,
    card_number     TEXT UNIQUE NOT NULL,      -- Encrypted / masked in production
    card_type       TEXT NOT NULL CHECK (card_type IN ('debit', 'credit', 'virtual')),
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'cancelled', 'pending_approval')),
    daily_limit     NUMERIC(12, 2) NOT NULL DEFAULT 2000.00,
    monthly_limit   NUMERIC(12, 2) NOT NULL DEFAULT 10000.00,
    expiry_month    INT NOT NULL CHECK (expiry_month BETWEEN 1 AND 12),
    expiry_year     INT NOT NULL,
    rewards_points  INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS card_applications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    card_type       TEXT NOT NULL,
    requested_limit NUMERIC(12, 2) NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewer_id     UUID,
    rejection_reason TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_card_applications_status ON card_applications(status);
