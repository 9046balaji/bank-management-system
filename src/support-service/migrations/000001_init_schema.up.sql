-- src/support-service/migrations/000001_init_schema.up.sql
-- Customer Support Service Schema (support_db)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS tickets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    subject         TEXT NOT NULL,
    description     TEXT NOT NULL,
    category        TEXT NOT NULL DEFAULT 'general',
    priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to     UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id       UUID NOT NULL,
    author_role     TEXT NOT NULL CHECK (author_role IN ('customer', 'agent', 'admin')),
    message         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    type            TEXT NOT NULL DEFAULT 'OTHER',
    category        TEXT NOT NULL DEFAULT 'APP',
    subject         TEXT NOT NULL,
    description     TEXT NOT NULL,
    rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    status          TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'REVIEWED', 'ACTIONED', 'REJECTED')),
    is_public       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faqs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question        TEXT NOT NULL,
    answer          TEXT NOT NULL,
    category        TEXT NOT NULL DEFAULT 'general',
    is_published    BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL DEFAULT gen_random_uuid(),
    sender_id       UUID NOT NULL,
    sender_type     TEXT NOT NULL CHECK (sender_type IN ('user', 'staff', 'bot')),
    message         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_public ON feedback(is_public) WHERE is_public = true;
