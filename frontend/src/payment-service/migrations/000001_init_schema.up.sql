-- src/payment-service/migrations/000001_init_schema.up.sql
-- Payment Service Schema (payments_db)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key     TEXT UNIQUE NOT NULL,   -- AUTHORITATIVE uniqueness constraint
    from_account_id     UUID NOT NULL,
    to_account_id       UUID NOT NULL,
    amount              NUMERIC(20, 4) NOT NULL CHECK (amount > 0),
    currency            CHAR(3) NOT NULL DEFAULT 'USD',
    status              TEXT NOT NULL DEFAULT 'INITIATED'
                            CHECK (status IN ('INITIATED','PENDING','LEDGER_COMMITTED','COMPLETED','FAILED','COMPENSATED')),
    fraud_score         NUMERIC(5, 2),           -- Score from Fraud Engine (0-100)
    fraud_decision      TEXT,                    -- APPROVE | FLAG | REJECT | FALLBACK_RULES
    reference_id        TEXT UNIQUE,             -- Human-readable reference (e.g. TXN-2024-XXXX)
    description         TEXT,
    failure_reason      TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS outbox_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type  TEXT NOT NULL,
    aggregate_id    UUID NOT NULL,
    event_type      TEXT NOT NULL,
    payload         JSONB NOT NULL,
    status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSED','DEAD')),
    retry_count     INT NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS atm_codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    code_hash       TEXT NOT NULL UNIQUE,        -- SHA-256 of 6-digit code
    amount          NUMERIC(20, 4) NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    status          TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CLAIMED','EXPIRED')),
    expires_at      TIMESTAMPTZ NOT NULL,
    claimed_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index for high-throughput outbox polling (SKIP LOCKED)
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_events (created_at ASC)
    WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(from_account_id, created_at DESC);
