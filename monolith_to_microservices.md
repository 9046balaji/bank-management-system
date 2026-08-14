# Production DevOps & AI Platform Blueprint: AuraBank Monolith → Microservices
> **Version 2.0 — Complete Migration Guide with Fixes, gRPC Specs, and Code Templates**

## Executive Summary

This document is the **hands-on engineering blueprint** for extracting the AuraBank monolith into domain-isolated microservices. It maps every route file, UI view, and database table to its target service, and provides concrete code structures, gRPC proto definitions, and database schemas — not just architecture descriptions.

---

## ⚠️ Fixes from v1.0

| # | Original Issue | Fix Applied |
|---|---|---|
| 1 | Flask AI service called out for migration but no migration path defined | Section 6 now has Flask→FastAPI+gRPC migration guide |
| 2 | `user_corrections.json` used for re-training (not production-safe) | Replaced with `feedback_corrections` PostgreSQL table |
| 3 | Embedding model for pgvector never specified | Now uses `sentence-transformers/all-MiniLM-L6-v2` (384-dim) |
| 4 | No concrete gRPC proto definitions provided | Full `ledger.proto` and `fraud.proto` added in Section 5 |
| 5 | No database schemas per service | Full schemas for `payments_db`, `ledger_db`, `user_db` in Section 4 |
| 6 | `analytics_db` reads from other service DBs (violates DB-per-service) | Analytics now consumes Kafka events, not direct DB reads |
| 7 | Admin views (AdminPaymentTracking, AdminFeedback) not mapped to a service | Mapped: Admin views route to their owning service + Analytics |
| 8 | No health check endpoint spec | Standard `/healthz/startup`, `/healthz/live`, `/healthz/ready` spec added |

---

## 1. Concrete Technology Stack

| Category | Selected Technology | Notes |
| :--- | :--- | :--- |
| Cloud | **AWS** (EKS, RDS, ECR, S3, Secrets Manager) | RDS Multi-AZ for prod |
| Orchestration | **Amazon EKS** | Karpenter for node provisioning |
| IaC | **Terraform** | Modular: VPC, EKS, RDS, ECR, IAM IRSA |
| GitOps | **ArgoCD** | Auto-sync from `gitops/` directory |
| CI | **GitHub Actions** | Matrix builds, Trivy, buf generate, helm lint |
| Secrets | **AWS Secrets Manager + ESO** | Never in Git |
| Core Services | **Go** | Payment, Ledger, Loan, Analytics, Outbox Worker, Notification Worker |
| App Services | **Node.js / TypeScript** | Auth, Card, Support |
| AI Services | **Python (FastAPI + gRPC)** | Fraud Engine, GenAI Advisor |
| Internal RPC | **gRPC (Protobuf v3)** | Payment→Ledger, Payment→Fraud, Loan→Fraud |
| External API | **REST (OpenAPI 3.0)** | All customer-facing routes |
| Events | **Apache Kafka (Strimzi)** | Outbox pattern; topics enumerated below |
| Database | **PostgreSQL 15** | Logical DB per service; RDS in prod |
| Migrations | **golang-migrate** | Init-container pattern in Helm |
| Cache | **Redis 7** | Idempotency fast path, sessions, rate limiting |
| Logs | **Grafana Loki** | Via OTel Collector stdout scrape |
| Metrics | **Prometheus + Alertmanager** | SLO recording rules, error budget |
| Traces | **Jaeger** | OTLP from OTel Gateway |
| Telemetry | **OpenTelemetry Collector** | DaemonSet Agent + Gateway Deployment |
| Vector DB | **pgvector** | PostgreSQL extension; `sentence-transformers/all-MiniLM-L6-v2` |
| ML Registry | **MLflow** | S3 artifact store backend |
| Load/Chaos | **k6 + LitmusChaos** | 5,000 RPS load; MTTR benchmarks |
| Local Dev | **KinD + LocalStack** | Zero-cost EKS mirror |

---

## 2. Complete Domain → Microservice Mapping

### 2.1 UI Views to Service Ownership

| UI View | Target Service | Key Data Fetched |
| :--- | :--- | :--- |
| `Landing.tsx` | Static (CDN / React SPA) | No backend call |
| `Auth.tsx` | **Auth Service** | Register, login, password reset, JWT |
| `KYC.tsx` | **Auth Service** | KYC verification, PIN setup |
| `Profile.tsx` | **Auth Service** | Profile read/update, notification prefs |
| `Dashboard.tsx` | **Ledger Service** + **Payment Service** | Balances, recent transactions |
| `ManageFunds.tsx` | **Payment Service** | Deposit, withdrawal, ATM token gen |
| `Transfer.tsx` | **Payment Service** | Wire transfer, idempotency, receipt |
| `Cards.tsx` | **Card Service** | Card list, freeze, limit, PIN reset |
| `Loans.tsx` | **Loan Service** | Active loans, EMI schedule, apply |
| `Analytics.tsx` | **Analytics Service** | Spending categories, cashflow trends |
| `Support.tsx` | **Support Service** | Ticket create/list, comments, FAQs, chat |
| `AdminOverview.tsx` | **Analytics Service** | Total deposits, users, transaction volume |
| `AdminCardApprovals.tsx` | **Card Service** | Pending card applications, approve/reject |
| `AdminLoanApprovals.tsx` | **Loan Service** | Loan applications, AI risk scores, approve/reject |
| `AdminPaymentTracking.tsx` | **Payment Service** | Transaction search, fraud flag inspection |
| `AdminFeedback.tsx` | **Support Service** | Feedback review, moderation, publish toggle |
| `AdminChat.tsx` | **Support Service** | Staff chat console |
| `AdminSystemConfig.tsx` | **Auth Service** (config endpoints) | Maintenance mode, transfer limits, interest rates |

### 2.2 Backend Route Modules to Service Ownership

| Route File | Target Service | Notes |
| :--- | :--- | :--- |
| `routes/users.ts` | **Auth Service** | Full migration — JWT, Argon2, KYC, profiles |
| `routes/accounts.ts` | **Ledger Service** | Account balance reads, account creation |
| `routes/transactions.ts` | **Payment Service** | Wire transfers, double-entry execution via gRPC |
| `routes/withdrawals.ts` | **Payment Service** | ATM token generation & claiming |
| `routes/ledger.ts` | **Ledger Service** | Ledger audit views, integrity endpoints |
| `routes/cards.ts` | **Card Service** | Card lifecycle, freeze, PIN, limits |
| `routes/loans.ts` | **Loan Service** | Loan CRUD, EMI calc, AI risk score via gRPC |
| `routes/analytics.ts` | **Analytics Service** | Spending summaries, cashflow — via Kafka events |
| `routes/support.ts` | **Support Service** | Tickets, comments, FAQs, feedback |
| `routes/chat.ts` | **Support Service** | Staff live chat |
| `routes/ml.ts` | **REMOVED** | ML calls now go via direct gRPC (Payment→Fraud, Loan→Fraud) |
| `routes/admin-ai.ts` | **Analytics Service** | Admin metrics; AI calls direct to Fraud/GenAI services |
| `routes/config.ts` | **Auth Service** | System config endpoints (admin-only JWT scope) |

---

## 3. Kafka Topic Registry

| Topic Name | Producer | Consumers | Payload |
| :--- | :--- | :--- | :--- |
| `payment.completed` | Outbox Worker | Notification Worker, Analytics Service | `{payment_id, amount, currency, from_account, to_account, timestamp}` |
| `payment.failed` | Outbox Worker | Notification Worker | `{payment_id, reason, timestamp}` |
| `loan.disbursed` | Outbox Worker | Notification Worker, Analytics Service | `{loan_id, amount, account_id, timestamp}` |
| `loan.repayment.received` | Outbox Worker | Notification Worker, Analytics Service | `{loan_id, amount, remaining_balance, timestamp}` |
| `card.issued` | Outbox Worker | Notification Worker | `{card_id, user_id, card_type, timestamp}` |
| `card.frozen` | Outbox Worker | Notification Worker | `{card_id, user_id, reason, timestamp}` |
| `notifications.email` | Notification Worker | — (external SMTP) | `{to, subject, template, data}` |
| `payment.completed.dlq` | Outbox Worker (on 3 retry fail) | Manual ops review | Raw failed event |
| `*.dlq` | Any worker on failure | Ops alerting + manual replay | Raw failed event |

---

## 4. Database Schemas Per Service

### 4.1 `user_db` — Auth & User Service

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    phone           TEXT,
    full_name       TEXT NOT NULL,
    password_hash   TEXT NOT NULL,          -- Argon2id
    role            TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    kyc_status      TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
    pin_hash        TEXT,                   -- 4-digit ATM PIN (Argon2id)
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL UNIQUE,   -- SHA-256 of raw token
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked         BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE kyc_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type   TEXT NOT NULL,          -- 'passport', 'national_id', 'ssn'
    document_ref    TEXT NOT NULL,          -- S3 object key (never store raw PII)
    verified_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE system_config (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_by      UUID REFERENCES users(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default config
INSERT INTO system_config (key, value) VALUES
    ('maintenance_mode', 'false'),
    ('daily_transfer_limit_usd', '50000'),
    ('loan_interest_rate_pct', '8.5');

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id) WHERE NOT revoked;
```

### 4.2 `ledger_db` — Core Ledger Service

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- System-level banking accounts (seeded on init)
CREATE TABLE accounts (
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

-- Immutable double-entry ledger
CREATE TABLE ledger_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL,          -- Groups DEBIT+CREDIT pair
    account_id      UUID NOT NULL REFERENCES accounts(id),
    entry_type      TEXT NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount          NUMERIC(20, 4) NOT NULL CHECK (amount > 0),
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraint: ledger_entries is append-only (enforced at app layer + DB trigger)
CREATE OR REPLACE FUNCTION prevent_ledger_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are immutable — updates not permitted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_immutability
    BEFORE UPDATE OR DELETE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION prevent_ledger_update();

-- System accounts (seeded, fixed UUIDs for deterministic references)
INSERT INTO accounts (id, account_number, account_type, user_id) VALUES
    ('00000000-0000-0000-0000-000000000001', 'BANK_CASH',    'system', NULL),
    ('00000000-0000-0000-0000-000000000002', 'BANK_REVENUE', 'system', NULL),
    ('00000000-0000-0000-0000-000000000003', 'BANK_FEES',    'system', NULL),
    ('00000000-0000-0000-0000-000000000004', 'SUSPENSE',     'system', NULL),
    ('00000000-0000-0000-0000-000000000005', 'BANK_LOANS',   'system', NULL);

-- Integrity verification function
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

CREATE INDEX idx_ledger_transaction ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_account ON ledger_entries(account_id, created_at DESC);
```

### 4.3 `payments_db` — Payment Service

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE payments (
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

CREATE TABLE outbox_events (
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

CREATE TABLE atm_codes (
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

-- Partial index for fast outbox polling
CREATE INDEX idx_outbox_pending ON outbox_events (created_at ASC)
    WHERE status = 'PENDING';

CREATE INDEX idx_payments_status ON payments(status, created_at DESC);
CREATE INDEX idx_payments_account ON payments(from_account_id, created_at DESC);
```

---

## 5. gRPC Proto Definitions

### 5.1 `proto/ledger.proto`

```protobuf
syntax = "proto3";
package ledger.v1;
option go_package = "github.com/yourusername/aurabank/gen/go/ledger/v1;ledgerv1";

import "google/protobuf/timestamp.proto";

service LedgerService {
    // Execute a balanced double-entry transaction
    rpc ExecuteDoubleEntry(ExecuteDoubleEntryRequest)
        returns (ExecuteDoubleEntryResponse);

    // Get account balance
    rpc GetAccountBalance(GetAccountBalanceRequest)
        returns (GetAccountBalanceResponse);

    // Verify ledger integrity (admin)
    rpc VerifyIntegrity(VerifyIntegrityRequest)
        returns (VerifyIntegrityResponse);
}

message LedgerEntry {
    string account_id  = 1;
    EntryType type     = 2;
    string amount      = 3;   // Decimal string to avoid float precision loss
    string currency    = 4;
    string description = 5;
}

enum EntryType {
    ENTRY_TYPE_UNSPECIFIED = 0;
    ENTRY_TYPE_DEBIT       = 1;
    ENTRY_TYPE_CREDIT      = 2;
}

message ExecuteDoubleEntryRequest {
    string transaction_id      = 1;   // Idempotency key for gRPC call
    repeated LedgerEntry entries = 2; // Must sum to zero
    string initiated_by        = 3;   // Service name for audit
}

message ExecuteDoubleEntryResponse {
    bool   success        = 1;
    string ledger_ref     = 2;   // Ledger transaction UUID
    string failure_reason = 3;
    google.protobuf.Timestamp committed_at = 4;
}

message GetAccountBalanceRequest {
    string account_id = 1;
    string currency   = 2;
}

message GetAccountBalanceResponse {
    string account_id = 1;
    string balance    = 2;   // Decimal string
    string currency   = 3;
    bool   is_frozen  = 4;
}

message VerifyIntegrityRequest {}

message VerifyIntegrityResponse {
    bool   all_balanced    = 1;
    int32  imbalanced_count = 2;
}
```

### 5.2 `proto/fraud.proto`

```protobuf
syntax = "proto3";
package fraud.v1;
option go_package = "github.com/yourusername/aurabank/gen/go/fraud/v1;fraudv1";
option py_generic_services = true;

import "google/protobuf/timestamp.proto";

service FraudService {
    // Evaluate transaction risk in real-time (target p95 < 10ms)
    rpc EvaluateRisk(EvaluateRiskRequest) returns (EvaluateRiskResponse);

    // Log model feedback for drift monitoring
    rpc LogPredictionFeedback(LogPredictionFeedbackRequest)
        returns (LogPredictionFeedbackResponse);
}

message EvaluateRiskRequest {
    string  transaction_id = 1;
    string  user_id        = 2;
    double  amount         = 3;
    string  currency       = 4;
    string  from_account   = 5;
    string  to_account     = 6;
    string  ip_address     = 7;
    string  user_agent     = 8;
    string  location       = 9;
    google.protobuf.Timestamp request_time = 10;
}

message EvaluateRiskResponse {
    double      fraud_score  = 1;   // 0.0 – 100.0
    RiskLevel   risk_level   = 2;
    Decision    decision     = 3;
    string      model_version = 4;  // MLflow run ID
    bool        used_fallback = 5;  // True if rule-based fallback was used
}

enum RiskLevel {
    RISK_LEVEL_UNSPECIFIED = 0;
    RISK_LEVEL_LOW         = 1;   // 0–30
    RISK_LEVEL_MEDIUM      = 2;   // 31–69
    RISK_LEVEL_HIGH        = 3;   // 70–100
}

enum Decision {
    DECISION_UNSPECIFIED = 0;
    DECISION_APPROVE     = 1;
    DECISION_FLAG        = 2;
    DECISION_REJECT      = 3;
}

message LogPredictionFeedbackRequest {
    string transaction_id  = 1;
    bool   was_actually_fraud = 2;
    string reviewer_id     = 3;
}

message LogPredictionFeedbackResponse {
    bool accepted = 1;
}
```

### 5.3 `buf.yaml` (buf CLI config for CI)

```yaml
version: v1
name: buf.build/aurabank/api
breaking:
  use:
    - FILE
lint:
  use:
    - DEFAULT
  except:
    - PACKAGE_VERSION_SUFFIX   # Allow v1 packages
```

---

## 6. AI Service Migration: Flask → FastAPI + gRPC

### 6.1 Why Migrate?

The existing `ai-service/app.py` (Flask) must be migrated to FastAPI for:
- **gRPC support**: Python Flask has no native gRPC server. FastAPI with `grpcio` serves gRPC alongside REST.
- **Performance**: FastAPI's async model handles concurrent inference requests without blocking.
- **Type safety**: Pydantic models for request validation; proto-generated types for gRPC.

### 6.2 New `ai-fraud-service/` Structure

```text
src/ai-fraud-service/
├── main.py                     # FastAPI + gRPC server entrypoint
├── grpc_server.py              # gRPC servicer implementation
├── rest_server.py              # FastAPI app (health, metrics, MLflow webhook)
├── models/
│   │── fraud_model.py          # XGBoost model loader + inference
│   └── fallback.py             # Rule-based fallback logic
├── proto/                      # Copied from repo root proto/ by Makefile
│   └── fraud_pb2*.py           # Generated by buf generate
├── mlflow_client.py            # MLflow model registry client
├── drift_monitor.py            # Prometheus metrics for input drift
├── requirements.txt
├── Dockerfile
└── tests/
    ├── test_fraud_model.py
    └── test_grpc_server.py
```

### 6.3 `main.py` — Concurrent gRPC + REST Server

```python
"""
AuraBank AI Fraud Service
Runs gRPC (port 9091) and REST/health (port 8080) concurrently.
"""
import asyncio
import logging
from concurrent import futures

import grpc
import uvicorn

from grpc_server import FraudServicer
from rest_server import app as fastapi_app
from proto import fraud_pb2_grpc

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

GRPC_PORT = 9091
REST_PORT = 8080


async def serve_grpc():
    server = grpc.aio.server(
        futures.ThreadPoolExecutor(max_workers=10),
        options=[
            ("grpc.max_send_message_length", 4 * 1024 * 1024),
            ("grpc.max_receive_message_length", 4 * 1024 * 1024),
            ("grpc.keepalive_time_ms", 30000),
        ],
    )
    fraud_pb2_grpc.add_FraudServiceServicer_to_server(FraudServicer(), server)
    server.add_insecure_port(f"[::]:{GRPC_PORT}")
    await server.start()
    logger.info(f"gRPC server started on port {GRPC_PORT}")
    await server.wait_for_termination()


async def serve_rest():
    config = uvicorn.Config(fastapi_app, host="0.0.0.0", port=REST_PORT, log_level="info")
    server = uvicorn.Server(config)
    await server.serve()


async def main():
    await asyncio.gather(serve_grpc(), serve_rest())


if __name__ == "__main__":
    asyncio.run(main())
```

### 6.4 `grpc_server.py` — FraudServicer with Circuit Breaker Fallback

```python
import time
import logging
from proto import fraud_pb2, fraud_pb2_grpc
from models.fraud_model import FraudModel
from models.fallback import rule_based_evaluate
from drift_monitor import record_prediction

logger = logging.getLogger(__name__)

# Module-level model (loaded once at startup)
_model = FraudModel()


class FraudServicer(fraud_pb2_grpc.FraudServiceServicer):
    async def EvaluateRisk(self, request, context):
        start = time.perf_counter()
        used_fallback = False

        try:
            score, decision, model_version = await _model.predict(
                amount=request.amount,
                user_id=request.user_id,
                location=request.location,
                ip_address=request.ip_address,
            )
        except Exception as e:
            # Model inference failed — fall back to deterministic rules
            logger.warning(f"Model inference failed, using fallback: {e}")
            score, decision = rule_based_evaluate(request.amount)
            model_version = "fallback-rules-v1"
            used_fallback = True

        latency_ms = (time.perf_counter() - start) * 1000
        record_prediction(
            score=score,
            latency_ms=latency_ms,
            used_fallback=used_fallback,
            amount=request.amount,
        )

        if latency_ms > 10:
            logger.warning(f"EvaluateRisk latency {latency_ms:.2f}ms exceeded 10ms target")

        risk_level = (
            fraud_pb2.RISK_LEVEL_LOW    if score < 30 else
            fraud_pb2.RISK_LEVEL_MEDIUM if score < 70 else
            fraud_pb2.RISK_LEVEL_HIGH
        )
        grpc_decision = (
            fraud_pb2.DECISION_APPROVE if decision == "APPROVE" else
            fraud_pb2.DECISION_FLAG    if decision == "FLAG"    else
            fraud_pb2.DECISION_REJECT
        )

        return fraud_pb2.EvaluateRiskResponse(
            fraud_score=score,
            risk_level=risk_level,
            decision=grpc_decision,
            model_version=model_version,
            used_fallback=used_fallback,
        )
```

### 6.5 `models/fallback.py` — Rule-Based Fallback

```python
"""
Rule-based fraud evaluation used when:
1. Model is loading (cold start)
2. Model inference throws an exception
3. Model response exceeds timeout threshold

These rules must NEVER block a payment — they are conservative defaults.
"""

def rule_based_evaluate(amount: float) -> tuple[float, str]:
    """Returns (score, decision) using simple heuristic rules."""
    if amount > 100_000:
        return 85.0, "FLAG"    # Very high amount — flag for review
    if amount > 50_000:
        return 55.0, "FLAG"    # High amount — flag
    return 20.0, "APPROVE"     # Default: approve with low score
```

### 6.6 GenAI Advisor: `user_corrections.json` → PostgreSQL Table

The original `user_corrections.json` file is not suitable for production:
- Not concurrent-safe (multiple pods writing to the same file)
- Lost on pod restart (unless mounted as PVC)
- No queryability for drift analysis

**Replacement: `feedback_corrections` table in `vector_db`**:

```sql
CREATE TABLE feedback_corrections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,
    transaction_id      UUID,
    original_description TEXT NOT NULL,
    predicted_category  TEXT NOT NULL,
    corrected_category  TEXT NOT NULL,
    confidence_delta    NUMERIC(5, 4),   -- improvement in model confidence post-correction
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- pgvector table for RAG knowledge base
CREATE TABLE financial_knowledge (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    category    TEXT,           -- 'faq', 'policy', 'product'
    embedding   vector(384),    -- all-MiniLM-L6-v2 output dimension
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_financial_knowledge_embedding
    ON financial_knowledge USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

---

## 7. Repository Structure

```text
aurabank/
├── .github/
│   └── workflows/
│       ├── ci.yaml                     # Main CI pipeline (matrix test, scan, build)
│       ├── helm-release.yaml           # Helm chart packaging
│       └── cluster-teardown.yaml       # Scheduled cost-saving teardown
├── terraform/
│   ├── environments/
│   │   ├── prod/                       # prod tfvars + backend config
│   │   └── staging/
│   └── modules/
│       ├── vpc/                        # VPC + subnets + NAT
│       ├── eks/                        # EKS cluster + node groups + Karpenter
│       ├── rds/                        # RDS Multi-AZ PostgreSQL
│       ├── ecr/                        # ECR repositories per service
│       ├── s3/                         # S3 buckets (MLflow artifacts, backups)
│       ├── iam/                        # IRSA roles per service
│       ├── elasticache/                # Redis ElastiCache
│       └── budget/                     # AWS Budget alerts
├── helm/
│   ├── _library/                       # Shared Helm library chart (base templates)
│   ├── auth-service/
│   ├── payment-service/
│   ├── ledger-service/
│   ├── outbox-worker/
│   ├── notification-worker/
│   ├── card-service/
│   ├── loan-service/
│   ├── support-service/
│   ├── analytics-service/
│   ├── ai-fraud-service/
│   └── genai-advisor-service/
├── gitops/
│   ├── apps/                           # ArgoCD Application manifests
│   │   ├── banking-namespace.yaml
│   │   └── observability-namespace.yaml
│   ├── external-secrets/               # ESO ExternalSecret manifests
│   └── namespaces/
├── proto/
│   ├── buf.yaml
│   ├── ledger.proto
│   └── fraud.proto
├── gen/                                # Auto-generated proto stubs (CI output)
│   ├── go/
│   └── python/
├── openapi/
│   ├── .spectral.yaml
│   ├── auth.yaml
│   ├── payment.yaml
│   ├── card.yaml
│   ├── loan.yaml
│   └── support.yaml
├── monitoring/
│   ├── otel-collector/
│   │   ├── otel-agent-config.yaml
│   │   ├── otel-gateway-config.yaml
│   │   └── local-config.yaml
│   ├── prometheus/
│   │   ├── prometheus.yml
│   │   ├── slo-rules.yaml              # SLO recording rules
│   │   └── alerts.yaml                 # Alertmanager alert rules
│   ├── loki/
│   │   └── loki-config.yaml
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/
│       │   └── dashboards/
│       └── dashboards/
│           ├── slo-error-budget.json
│           ├── payment-overview.json
│           ├── fraud-engine.json
│           └── kafka-lag.json
├── chaos/
│   ├── litmus/
│   │   ├── pod-crash-payment.yaml
│   │   ├── latency-inject-ledger.yaml
│   │   └── kafka-broker-kill.yaml
│   └── results/                        # MTTR benchmark results (committed after runs)
├── load-tests/
│   ├── k6/
│   │   ├── payment-load.js             # 5,000 RPS payment flow
│   │   ├── idempotency-replay.js       # Duplicate key replay test
│   │   └── auth-flow.js
│   └── scenarios/
├── scripts/
│   ├── init-dbs.sql                    # Local dev: create all logical DBs
│   ├── seed-system-accounts.sql
│   └── verify-ledger.sh
├── src/
│   ├── auth-service/                   # Node.js / TypeScript
│   │   ├── src/
│   │   ├── migrations/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── payment-service/                # Go
│   │   ├── cmd/server/main.go
│   │   ├── internal/
│   │   │   ├── handler/
│   │   │   ├── service/
│   │   │   ├── repository/
│   │   │   └── outbox/
│   │   ├── migrations/
│   │   └── Dockerfile
│   ├── ledger-service/                 # Go
│   ├── outbox-worker/                  # Go (standalone binary)
│   ├── notification-worker/            # Go (standalone binary)
│   ├── card-service/                   # Node.js / TypeScript
│   ├── loan-service/                   # Go
│   ├── support-service/                # Node.js / TypeScript
│   ├── analytics-service/              # Go
│   ├── ai-fraud-service/               # Python (FastAPI + gRPC)
│   └── genai-advisor-service/          # Python (FastAPI)
├── frontend/                           # React 19 SPA (18 views)
├── docker-compose.local.yaml           # Local dev full stack
└── README.md
```

---

## 8. Health Check Endpoint Standard

Every service must implement these three endpoints:

```go
// Go example — payment-service/internal/handler/health.go
func (h *HealthHandler) Startup(w http.ResponseWriter, r *http.Request) {
    // Check DB connection is ready
    if err := h.db.PingContext(r.Context()); err != nil {
        http.Error(w, `{"status":"starting"}`, http.StatusServiceUnavailable)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (h *HealthHandler) Live(w http.ResponseWriter, r *http.Request) {
    // Liveness: are we deadlocked? (simple OK — let K8s restart if handler is stuck)
    w.WriteHeader(http.StatusOK)
}

func (h *HealthHandler) Ready(w http.ResponseWriter, r *http.Request) {
    // Readiness: can we serve traffic right now?
    ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
    defer cancel()

    if err := h.db.PingContext(ctx); err != nil {
        http.Error(w, `{"status":"not ready","reason":"db"}`, http.StatusServiceUnavailable)
        return
    }
    if err := h.redis.Ping(ctx).Err(); err != nil {
        // Redis down: still serve traffic (PG is authoritative)
        // Log warning but don't fail readiness
    }
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"status": "ready"})
}
```

```python
# Python FastAPI example — ai-fraud-service/rest_server.py
from fastapi import FastAPI, Response
from models.fraud_model import FraudModel

app = FastAPI()
model = FraudModel()

@app.get("/healthz/startup")
async def startup():
    if not model.is_loaded():
        return Response(status_code=503, content='{"status":"loading"}')
    return {"status": "ok"}

@app.get("/healthz/live")
async def live():
    return {"status": "ok"}

@app.get("/healthz/ready")
async def ready():
    if not model.is_loaded():
        return Response(status_code=503, content='{"status":"model not ready"}')
    return {"status": "ready", "model_version": model.version}

@app.get("/metrics")
async def metrics():
    # Prometheus exposition format — served by prometheus_client
    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
```

---

## 9. 5-Phase Migration Execution Checklist

### Phase 0: Local Foundation ✅ Prerequisite
- [ ] Docker Compose full stack runs (`docker-compose.local.yaml`)
- [ ] All monolith tests pass (`npm test` + `pytest`)
- [ ] Baseline k6 load test run on monolith (capture p50/p95/p99 latency)
- [ ] Monolith audit: document all cross-domain DB queries to catch hidden coupling

### Phase 1: Cloud Platform & IaC
- [ ] Terraform modules: VPC, EKS, RDS, ECR, S3, ElastiCache, IAM IRSA, Budget Alert
- [ ] GitHub Actions CI: matrix lint/test, Trivy scan, `buf generate`, `spectral lint`, `helm lint`
- [ ] ArgoCD installed on EKS; GitOps `apps/` directory syncing
- [ ] External Secrets Operator + ClusterSecretStore configured
- [ ] Secrets stored in AWS Secrets Manager (NOT in Git)

### Phase 2: Core Banking Services
- [ ] Auth Service: JWT access/refresh, Argon2, KYC — deployed + integration tested
- [ ] Ledger Service: double-entry gRPC endpoint, `verify_ledger_integrity()` function
- [ ] Payment Service: state machine, outbox writer, idempotency constraint, ATM tokens
- [ ] Outbox Worker: concurrent-safe polling (`FOR UPDATE SKIP LOCKED`), DLQ routing
- [ ] Notification Worker: Kafka consumer, email/SMS dispatch
- [ ] `golang-migrate` init containers in all Helm charts
- [ ] gRPC Payment→Ledger integration test: 1,000 transfers, verify zero-sum

### Phase 3: Business Services
- [ ] Card Service: issuing, freeze/unfreeze, PIN, rewards, admin approval flow
- [ ] Loan Service: application wizard, EMI schedule, repayment, AI risk score via gRPC
- [ ] Support Service: tickets, comments, feedback (1-5 star), FAQs, staff chat
- [ ] Analytics Service: Kafka consumer for payment/loan events; spending aggregation

### Phase 4: Observability + K8s Hardening
- [ ] OTel DaemonSet Agent deployed across all nodes
- [ ] OTel Gateway: tail sampling + SpanMetrics + batching configured
- [ ] Jaeger receiving OTLP traces; end-to-end payment trace visible
- [ ] Loki receiving JSON logs; structured log query works in Grafana
- [ ] Prometheus SLO recording rules + error budget dashboards in Grafana
- [ ] NetworkPolicies: default-deny + explicit allow per service
- [ ] PDB, TopologySpreadConstraints, HPA on all deployments
- [ ] Karpenter NodePool configured
- [ ] LitmusChaos experiments run; MTTR results committed to `chaos/results/`
- [ ] k6 load test at 5,000 RPS; `verify_ledger_integrity()` returns 0 rows

### Phase 5: AI & MLOps
- [ ] Flask → FastAPI migration complete; `ai-service/app.py` deprecated
- [ ] `buf generate` produces Python gRPC stubs; FraudServicer passes gRPC test
- [ ] XGBoost model trained; MLflow experiment tracked; model registered
- [ ] Fraud gRPC endpoint meets p95 < 10ms target under load (k6 test)
- [ ] Circuit breaker: kill fraud pod during payment load; confirm fallback rules activate
- [ ] `feedback_corrections` table replaces `user_corrections.json`
- [ ] GenAI RAG advisor: MiniLM embeddings, ivfflat index, semantic search working
- [ ] Model drift dashboard in Grafana; Alertmanager rule fires on drift threshold
