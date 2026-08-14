-- src/analytics-service/migrations/000001_init_schema.up.sql
-- Analytics & Reporting Service Schema (analytics_db)
-- Read-optimized schema populated strictly by Kafka events (Kafka consumer)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS spending_aggregations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,
    category            TEXT NOT NULL,
    total_amount        NUMERIC(14, 2) NOT NULL DEFAULT 0,
    transaction_count   INT NOT NULL DEFAULT 0,
    period_year         INT NOT NULL,
    period_month        INT NOT NULL,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, category, period_year, period_month)
);

CREATE TABLE IF NOT EXISTS daily_cashflow (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id          UUID NOT NULL,
    cash_date           DATE NOT NULL,
    total_inflow        NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_outflow       NUMERIC(14, 2) NOT NULL DEFAULT 0,
    net_flow            NUMERIC(14, 2) NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (account_id, cash_date)
);

CREATE TABLE IF NOT EXISTS executive_metrics (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name         TEXT UNIQUE NOT NULL,
    metric_value        NUMERIC(16, 2) NOT NULL,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial executive metrics
INSERT INTO executive_metrics (metric_name, metric_value) VALUES
    ('total_deposits_usd', 1250000.00),
    ('active_users', 1420.00),
    ('monthly_volume_usd', 4500000.00)
ON CONFLICT (metric_name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_spending_user ON spending_aggregations(user_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_cashflow_account ON daily_cashflow(account_id, cash_date DESC);
