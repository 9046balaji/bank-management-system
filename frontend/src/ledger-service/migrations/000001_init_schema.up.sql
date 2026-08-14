-- src/ledger-service/migrations/000001_init_schema.up.sql
-- Core Ledger Service Schema (ledger_db)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Accounts table (customer accounts + system accounts)
CREATE TABLE IF NOT EXISTS accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID,                   -- NULL for system accounts
    account_number  TEXT UNIQUE NOT NULL,
    account_type    TEXT NOT NULL CHECK (account_type IN ('savings', 'checking', 'system')),
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    balance         NUMERIC(20, 4) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    is_frozen       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutable double-entry ledger entries
CREATE TABLE IF NOT EXISTS ledger_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL,          -- Groups DEBIT + CREDIT pair
    account_id      UUID NOT NULL REFERENCES accounts(id),
    entry_type      TEXT NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount          NUMERIC(20, 4) NOT NULL CHECK (amount > 0),
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ledger Immutability Constraint (DB trigger prevents UPDATE / DELETE)
CREATE OR REPLACE FUNCTION prevent_ledger_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are immutable — updates and deletes are not permitted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ledger_immutability ON ledger_entries;
CREATE TRIGGER ledger_immutability
    BEFORE UPDATE OR DELETE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION prevent_ledger_update();

-- Seed fixed system banking accounts
INSERT INTO accounts (id, account_number, account_type, user_id) VALUES
    ('00000000-0000-0000-0000-000000000001', 'BANK_CASH',    'system', NULL),
    ('00000000-0000-0000-0000-000000000002', 'BANK_REVENUE', 'system', NULL),
    ('00000000-0000-0000-0000-000000000003', 'BANK_FEES',    'system', NULL),
    ('00000000-0000-0000-0000-000000000004', 'SUSPENSE',     'system', NULL),
    ('00000000-0000-0000-0000-000000000005', 'BANK_LOANS',   'system', NULL)
ON CONFLICT (id) DO NOTHING;

-- Ledger integrity verification SQL function
CREATE OR REPLACE FUNCTION verify_ledger_integrity()
RETURNS TABLE(transaction_id UUID, imbalance NUMERIC) AS $$
    SELECT
        transaction_id,
        SUM(CASE entry_type
            WHEN 'DEBIT'  THEN  amount
            WHEN 'CREDIT' THEN -amount
        END) AS imbalance
    FROM ledger_entries
    GROUP BY transaction_id
    HAVING ABS(SUM(CASE entry_type
        WHEN 'DEBIT'  THEN  amount
        WHEN 'CREDIT' THEN -amount
    END)) > 0.0001;
$$ LANGUAGE SQL;

CREATE INDEX IF NOT EXISTS idx_ledger_transaction ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger_entries(account_id, created_at DESC);
