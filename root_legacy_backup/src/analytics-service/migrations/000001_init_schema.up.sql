-- src/analytics-service/migrations/000001_init_schema.up.sql
CREATE TABLE IF NOT EXISTS spending_aggregations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    category VARCHAR(100) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    transaction_count INT NOT NULL DEFAULT 0,
    period_month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_category_period UNIQUE (user_id, category, period_month)
);

CREATE TABLE IF NOT EXISTS daily_cashflow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL,
    total_inflow NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_outflow NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    entry_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_account_date UNIQUE (account_id, entry_date)
);

CREATE TABLE IF NOT EXISTS executive_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC(18, 4) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
