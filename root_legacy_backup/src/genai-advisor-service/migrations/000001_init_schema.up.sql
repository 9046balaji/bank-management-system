-- src/genai-advisor-service/migrations/000001_init_schema.up.sql
-- GenAI Advisor & Vector DB Schema (vector_db)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- PostgreSQL table replacing user_corrections.json for production feedback training
CREATE TABLE IF NOT EXISTS feedback_corrections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,
    transaction_id      UUID,
    original_description TEXT NOT NULL,
    predicted_category  TEXT NOT NULL,
    corrected_category  TEXT NOT NULL,
    confidence_delta    NUMERIC(5, 4),   -- improvement in model confidence post-correction
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- pgvector table for RAG knowledge base (sentence-transformers/all-MiniLM-L6-v2 embeddings)
CREATE TABLE IF NOT EXISTS financial_knowledge (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    category    TEXT DEFAULT 'faq',      -- 'faq', 'policy', 'product'
    embedding   vector(384),             -- 384-dimensional output from all-MiniLM-L6-v2
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IVFFlat approximate nearest neighbor index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_financial_knowledge_embedding
    ON financial_knowledge USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
