-- src/ai-fraud-service/migrations/000001_init_schema.up.sql
CREATE TABLE IF NOT EXISTS fraud_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID,
    user_id UUID,
    amount NUMERIC(15, 2),
    fraud_score NUMERIC(5, 2),
    decision VARCHAR(20),
    used_fallback BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
