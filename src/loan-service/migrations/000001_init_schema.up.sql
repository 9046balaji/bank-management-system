-- src/loan-service/migrations/000001_init_schema.up.sql
-- Loan & Credit Service Schema (loans_db)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS loans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,
    account_id          UUID NOT NULL,
    amount              NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    interest_rate       NUMERIC(5, 2) NOT NULL DEFAULT 8.5,
    term_months         INT NOT NULL CHECK (term_months > 0),
    monthly_emi         NUMERIC(12, 2) NOT NULL,
    remaining_balance   NUMERIC(12, 2) NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected', 'disbursed', 'closed')),
    ai_risk_score       NUMERIC(5, 2),        -- Risk score from Fraud/Risk Engine (0-100)
    ai_decision         TEXT,                 -- APPROVE | FLAG | REJECT
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disbursed_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS loan_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id         UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    installment_no  INT NOT NULL,
    due_date        DATE NOT NULL,
    emi_amount      NUMERIC(12, 2) NOT NULL,
    principal       NUMERIC(12, 2) NOT NULL,
    interest        NUMERIC(12, 2) NOT NULL,
    status          TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue')),
    paid_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS repayments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id         UUID NOT NULL REFERENCES loans(id),
    amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method  TEXT NOT NULL DEFAULT 'auto_debit',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_schedules_due ON loan_schedules(loan_id, due_date);
