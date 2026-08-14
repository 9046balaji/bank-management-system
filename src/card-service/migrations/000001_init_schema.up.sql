-- src/card-service/migrations/000001_init_schema.up.sql
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    account_id UUID NOT NULL,
    card_number VARCHAR(16) NOT NULL UNIQUE,
    card_type VARCHAR(20) NOT NULL DEFAULT 'DEBIT', -- 'DEBIT', 'CREDIT'
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',   -- 'ACTIVE', 'FROZEN', 'BLOCKED'
    daily_limit NUMERIC(15, 2) DEFAULT 2500.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS card_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    card_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
