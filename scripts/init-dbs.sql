-- =============================================================
-- scripts/init-dbs.sql
-- AuraBank — Local Dev: Create All Microservice Logical Databases
-- =============================================================
-- Run by postgres init container on first startup.
-- Creates a separate logical database per microservice
-- (mirrors the DB-per-service pattern on RDS in production).
--
-- Usage: automatically mounted as /docker-entrypoint-initdb.d/10-init-dbs.sql
-- =============================================================

-- ── Auth & User Service ──────────────────────────────────────
SELECT 'Creating user_db...' AS status;
CREATE DATABASE user_db;

-- ── Core Ledger Service ──────────────────────────────────────
SELECT 'Creating ledger_db...' AS status;
CREATE DATABASE ledger_db;

-- ── Payment & Transfer Service ───────────────────────────────
SELECT 'Creating payments_db...' AS status;
CREATE DATABASE payments_db;

-- ── Card Management Service ──────────────────────────────────
SELECT 'Creating cards_db...' AS status;
CREATE DATABASE cards_db;

-- ── Loan & Credit Service ────────────────────────────────────
SELECT 'Creating loans_db...' AS status;
CREATE DATABASE loans_db;

-- ── Customer Support Service ─────────────────────────────────
SELECT 'Creating support_db...' AS status;
CREATE DATABASE support_db;

-- ── Analytics & Reporting Service ───────────────────────────
SELECT 'Creating analytics_db...' AS status;
CREATE DATABASE analytics_db;

-- ── GenAI Financial Advisor (pgvector) ──────────────────────
SELECT 'Creating vector_db...' AS status;
CREATE DATABASE vector_db;

-- ── MLflow Backend Store ─────────────────────────────────────
SELECT 'Creating mlflow_db...' AS status;
CREATE DATABASE mlflow_db;

-- =============================================================
-- Enable extensions per database
-- =============================================================

-- user_db: pgcrypto for gen_random_uuid()
\connect user_db
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SELECT 'user_db: pgcrypto enabled' AS status;

-- ledger_db: pgcrypto
\connect ledger_db
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SELECT 'ledger_db: pgcrypto enabled' AS status;

-- payments_db: pgcrypto
\connect payments_db
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SELECT 'payments_db: pgcrypto enabled' AS status;

-- cards_db: pgcrypto
\connect cards_db
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SELECT 'cards_db: pgcrypto enabled' AS status;

-- loans_db: pgcrypto
\connect loans_db
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SELECT 'loans_db: pgcrypto enabled' AS status;

-- support_db: pgcrypto
\connect support_db
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SELECT 'support_db: pgcrypto enabled' AS status;

-- analytics_db: pgcrypto
\connect analytics_db
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SELECT 'analytics_db: pgcrypto enabled' AS status;

-- vector_db: pgcrypto + pgvector (for RAG embeddings)
\connect vector_db
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
SELECT 'vector_db: pgcrypto + pgvector enabled' AS status;

SELECT 'All microservice databases created successfully.' AS status;
