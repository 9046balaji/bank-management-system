# Chaos Results: Phase 0 Baseline
> **Date**: 2026-08-14  
> **Environment**: Monolith (before migration)  
> **Purpose**: Establish "before" performance baseline for portfolio comparison

---

## Monolith Test Suite Results

### Backend Tests (`npm test`)

| Status | Count | Details |
|---|---|---|
| ✅ **Passing** | 9 | `accountLockout.test.ts` — Account lockout middleware |
| ✅ **Passing** | 1 | `health.test.ts` — GET /health returns 200 |
| ⚠️ **Note** | — | Other test suites skipped (require live DB connection) |

**Finding**: Unit tests pass. Integration tests require running PostgreSQL + Redis — these run against the live docker-compose stack.

**Fix applied**: Added `JWT_REFRESH_SECRET` to `backend/.env.local` so tests can run without manual env var setup.

---

### AI Service Tests (`pytest`)

| Status | Details |
|---|---|
| ❌ **Blocked** | `flask` not in current Python virtual environment (`attendance` conda env) |
| ✅ **Resolution** | Run inside Docker: `docker-compose run ai-service pytest tests/` |

---

## k6 Baseline Targets

> **To run**: Start the monolith with `docker-compose up`, then:
> ```bash
> k6 run load-tests/k6/auth-flow.js
> k6 run load-tests/k6/payment-load.js --env MODE=baseline
> ```

### Expected Monolith Baseline (to be updated after first run)

| Metric | Monolith Target | Microservices SLO | Status |
|---|---|---|---|
| Auth login p95 | < 500ms | < 200ms | 🔲 Pending measurement |
| Payment transfer p95 | < 2000ms | < 500ms | 🔲 Pending measurement |
| Payment error rate | < 5% | < 0.1% (99.9%) | 🔲 Pending measurement |
| Auth error rate | < 5% | < 0.05% (99.95%) | 🔲 Pending measurement |

---

## Cross-Domain Coupling Finding

See [`docs/cross-domain-coupling.md`](../docs/cross-domain-coupling.md) for the full audit.

**Key finding**: `analytics.ts` and `admin-ai.ts` read from 4+ domain tables each — these are the highest-risk routes for migration and will be replaced last using Kafka event consumers.

---

## Phase 0 Completion Checklist

- [x] docker-compose.local.yaml created with full stack (Kafka, LocalStack, MLflow, Loki, pgvector)
- [x] scripts/init-dbs.sql creates all 9 microservice logical databases  
- [x] OTel local-config.yaml with tail sampling + SpanMetrics
- [x] k6 baseline test scripts created (auth-flow.js, payment-load.js)
- [x] Cross-domain coupling audit completed (docs/cross-domain-coupling.md)
- [x] JWT_REFRESH_SECRET added to backend/.env.local
- [x] Backend unit tests confirmed passing (9/9 with JWT env vars)
- [ ] Run docker-compose.local.yaml and confirm all services healthy
- [ ] Run k6 baseline tests and record actual p50/p95/p99 numbers in this file

---

*Next: Phase 1 — Terraform IaC + GitHub Actions CI + ArgoCD GitOps*
