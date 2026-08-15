# Production DevOps & AI Platform Plan: AuraBank System
> **Version 2.0 — Enhanced with Fixes, Missing Components & Interview-Ready Additions**

## Executive Summary & Engineering Blueprint

This document defines the **definitive engineering plan** to decompose the monolithic **AuraBank Bank Management System** into a production-grade, event-driven, cloud-native **DevOps + MLOps Platform** hosted on **AWS EKS**.

### Primary Goal
To serve as a **flagship, portfolio-ready project for a DevOps / SRE / Platform Engineer**, demonstrating deep architectural discipline and full mapping of monolithic domain features:
- **Zero Ambiguity Stack**: Single tool choice per responsibility (AWS, EKS, Terraform, Go, Node.js, Python, PostgreSQL, Kafka, Redis, OTel, Prometheus, Jaeger, Loki, Grafana, ArgoCD, GitHub Actions).
- **Comprehensive Monolithic Domain Mapping**: Decomposes all 18 UI views and 13 Express route modules into isolated microservices.
- **Distributed Transaction & State Machine**: Saga-style orchestration with explicit payment transaction state machine (`INITIATED` → `PENDING` → `LEDGER_COMMITTED` → `COMPLETED`) and compensating actions.
- **Core Engineering Patterns**: Transactional Outbox Pattern, Authoritative PostgreSQL `UNIQUE(idempotency_key)` constraints, gRPC Protobuf Contracts, Versioned Database Migrations (`golang-migrate`), Kafka DLQ & Retries.
- **SRE & Production Hardening**: OTel Agent (DaemonSet) + Gateway architecture, Tail-Based Sampling, NetworkPolicies, HPA + Karpenter, PodDisruptionBudgets, TopologySpreadConstraints, per-service SLOs, Error Budgets, MTTR Chaos benchmarks.
- **MLOps & AI Boundaries**: Real-time gRPC Fraud Engine (FastAPI + XGBoost, p95 < 10ms target), MLflow versioning, Model Drift Monitoring, Online Re-training Feedback Loop, GenAI Financial Advisor (pgvector RAG).
- **Cost-Conscious Dual Environment**: Local (Docker Compose / Kind) for zero-cost daily dev; AWS (EKS / ECR / S3) for ephemeral GitOps deployments and load tests.

---

## ⚠️ Critical Fixes & Enhancements from v1.0 Review

### Fix 1 — Missing Phase 4 (Observability) in Roadmap Numbering
The original plan had Phase 3 labeled as "SRE & Observability" but the Kubernetes hardening (originally labeled Phase 4) was not clearly separated from the Phase 3 observability work. Clarified below with explicit deliverables per phase.

### Fix 2 — Secret Management Not Addressed
The original plan referenced IAM IRSA but never defined how application secrets (DB passwords, API keys) are managed. **Added**: AWS Secrets Manager + External Secrets Operator (ESO) integration, replacing raw Kubernetes Secrets.

### Fix 3 — Missing Ingress Controller Specification
The plan mentioned "Envoy Ingress" and "AWS ALB" interchangeably without clarification. **Clarified**: AWS Load Balancer Controller (ALB Ingress) for L7 routing; Envoy/Istio optional for service mesh mTLS — not both simultaneously.

### Fix 4 — AI Fraud Service: Flask → FastAPI Migration Not Scoped
The existing `ai-service/app.py` is Flask. The plan calls for FastAPI + gRPC but never defined the migration steps or the gRPC stub generation pipeline. **Added**: explicit gRPC migration scope in Phase 5.

### Fix 5 — No Local Kind/Docker Compose Mirror for AWS Services
Phase 0 lacked concrete local equivalents for AWS-only services. **Added**: LocalStack for S3/ECR simulation; Strimzi on Kind for Kafka; KinD multi-node cluster spec.

### Fix 6 — Database Migration Strategy Undefined
The plan assumed `golang-migrate` but never defined baseline schema files or the migration runner init-container pattern. **Added**: init-container migration pattern in Helm chart spec.

### Fix 7 — Missing OTel Collector Config Fragments
The observability plan referenced "SpanMetrics Connector" and "Tail Sampling" without any concrete configuration. **Added**: annotated `otel-collector-config.yaml` in Section 7.

### Fix 8 — GitHub Actions CI Workflow Gaps
The plan mentioned Trivy + SonarQube but missed: matrix builds for Go/Node/Python, conditional deployment gates, Helm chart linting (`helm lint`), and `protoc` stub generation step. **Added** in Section 8.

### Fix 9 — No Cost Guardrail for AWS
No mention of budget controls. EKS clusters left running = significant unexpected costs. **Added**: AWS Budget Alert + scheduled cluster teardown workflow.

### Fix 10 — GenAI Advisor: Embedding Model Not Specified
pgvector stores embeddings, but the embedding model was never named. `user_corrections.json` is not suitable for production re-training. **Clarified**: Use `sentence-transformers/all-MiniLM-L6-v2` for embeddings; move corrections to a PostgreSQL `feedback_corrections` table.

---

## 1. Concrete Technology Stack Decisions

| Category | Single Selected Technology | Rationale |
| :--- | :--- | :--- |
| **Cloud Provider** | **AWS** | EKS, ECR, S3, IAM, VPC, Secrets Manager |
| **Orchestration** | **Amazon EKS** | Managed K8s control plane + Karpenter node provisioning |
| **Infrastructure as Code** | **Terraform** | Modular IaC: VPC, EKS, IAM IRSA, ECR, S3, Budget Alerts |
| **GitOps Engine** | **ArgoCD** | Declarative CD tracking `gitops/` manifests with health checks |
| **CI Automation** | **GitHub Actions** | Matrix lint/test, Trivy scan, `protoc` gen, Helm lint, Docker build |
| **Secret Management** | **AWS Secrets Manager + ESO** | External Secrets Operator syncs secrets into K8s without storing them in Git |
| **Ingress** | **AWS ALB Ingress Controller** | Native L7 routing; no Envoy duplication at ingress layer |
| **Backend Core** | **Go** | Payment, Ledger, Notification, Analytics, Outbox Worker |
| **Application Layer** | **Node.js / TypeScript** | Auth Service, Card Service, Support Service |
| **AI / MLOps** | **Python (FastAPI + gRPC)** | Fraud Engine, GenAI Advisor — migrated from Flask |
| **External API** | **REST (OpenAPI 3.0)** | Customer-facing APIs; validated in CI |
| **Internal RPC** | **gRPC (Protobuf v3)** | Payment↔Ledger, Payment↔Fraud — `proto/` stubs auto-generated in CI |
| **Event Broker** | **Apache Kafka (Strimzi)** | Outbox events, DLQ, retries — Strimzi Operator on EKS |
| **Database** | **PostgreSQL 15 (RDS Multi-AZ)** | Logical DB-per-Service; RDS for prod, local Docker for dev |
| **DB Migrations** | **golang-migrate** | Init-container pattern per Helm chart; versioned SQL migration files |
| **Caching** | **Redis (ElastiCache)** | Fast idempotency lookup; session cache; PostgreSQL remains authoritative |
| **Logs** | **Grafana Loki + Promtail** | Stdout JSON log aggregation via OTel Agent |
| **Metrics** | **Prometheus + Alertmanager** | SpanMetrics, SLO recording rules, Error Budget burn-rate panels |
| **Traces** | **Jaeger** | Distributed tracing backend receiving OTLP from OTel Gateway |
| **Telemetry** | **OpenTelemetry Collector** | DaemonSet Agent + Gateway Deployment |
| **Vector Search** | **pgvector (PostgreSQL ext.)** | RAG embeddings via `sentence-transformers/all-MiniLM-L6-v2` |
| **ML Model Registry** | **MLflow** | Model versioning, artifact storage (S3 backend), drift metrics |
| **Load & Chaos** | **k6 + LitmusChaos** | Synthetic load at 5,000 RPS; MTTR chaos benchmarks |
| **Local Dev Mirror** | **KinD + LocalStack** | Simulates EKS (KinD) and S3/ECR (LocalStack) at zero cost |

---

## 2. Architecture & Data Flow Visualizations

### 2.1 Target Production Architecture (AWS EKS)

```mermaid
graph TD
    classDef client fill:#2563eb,color:white,stroke:#1d4ed8;
    classDef gateway fill:#7c3aed,color:white,stroke:#5b21b6;
    classDef core fill:#059669,color:white,stroke:#047857;
    classDef ai fill:#db2777,color:white,stroke:#be185d;
    classDef db fill:#475569,color:white,stroke:#1e293b;
    classDef bus fill:#d97706,color:white,stroke:#b45309;
    classDef devops fill:#0284c7,color:white,stroke:#0369a1;
    classDef secret fill:#dc2626,color:white,stroke:#991b1b;

    Users["Internet Users / React 19 SPA (18 Views)"]:::client

    ALB["AWS ALB (L7 Routing / TLS Termination)"]:::gateway
    SecretsManager["AWS Secrets Manager"]:::secret
    ESO["External Secrets Operator"]:::secret

    subgraph EKS["Kubernetes Cluster (AWS EKS — Multi-AZ us-east-1a/b/c)"]
        subgraph Edge
            Ingress["ALB Ingress Controller<br/>JWT Validation + W3C TraceContext"]:::gateway
        end

        subgraph CoreServices["Phase 2: Core Banking Services"]
            AuthSvc["Auth & User Service (Node.js)<br/>Argon2 · JWT · KYC<br/>DB: user_db"]:::core
            PaymentSvc["Payment Service (Go)<br/>State Machine · Idempotency · ATM Tokens<br/>Outbox Writer<br/>DB: payments_db"]:::core
            LedgerSvc["Ledger Service (Go)<br/>Double-Entry · System Accounts<br/>DB: ledger_db"]:::core
            NotifWorker["Notification Worker (Go)<br/>Kafka Consumer · Email/SMS/Push"]:::core
            OutboxWorker["Outbox Publisher (Go)<br/>Polls outbox_events · Publishes to Kafka"]:::bus
        end

        subgraph BizServices["Phase 3: Business Services"]
            CardSvc["Card Service (Node.js)<br/>DB: cards_db"]:::core
            LoanSvc["Loan Service (Go)<br/>DB: loans_db"]:::core
            SupportSvc["Support Service (Node.js)<br/>DB: support_db"]:::core
            AnalyticsSvc["Analytics Service (Go)<br/>DB: analytics_db"]:::core
        end

        subgraph AIServices["Phase 5: AI & MLOps"]
            FraudSvc["Fraud Engine (FastAPI + gRPC)<br/>XGBoost · MLflow · p95 < 10ms<br/>Circuit Breaker Fallback"]:::ai
            GenAISvc["GenAI Advisor (FastAPI)<br/>pgvector RAG · MiniLM Embeddings<br/>DB: vector_db"]:::ai
        end

        subgraph Kafka["Event Backbone (Strimzi Kafka)"]
            KafkaBroker[["Topics: payment.completed<br/>loan.disbursed · card.frozen<br/>notifications.email · *.dlq"]]:::bus
        end

        subgraph Observability["Observability (OTel DaemonSet + Gateway)"]
            OTelAgent[["OTel Agent (DaemonSet)<br/>Collects from all pods on node"]]:::devops
            OTelGateway[["OTel Gateway (Deployment + HPA)<br/>SpanMetrics · Tail Sampling · Batching"]]:::devops
            Prometheus["Prometheus + Alertmanager"]:::devops
            Loki["Grafana Loki"]:::devops
            Jaeger["Jaeger (OTLP backend)"]:::devops
            Grafana["Grafana<br/>SLO · Error Budget · Drift"]:::devops
        end
    end

    subgraph Storage["Storage Tier (RDS Multi-AZ + ElastiCache)"]
        RDS[("PostgreSQL 15 RDS<br/>Logical DBs per service")]:::db
        Redis[("Redis ElastiCache<br/>Session · Idempotency Cache")]:::db
    end

    Users --> ALB --> Ingress
    SecretsManager --> ESO --> CoreServices
    SecretsManager --> ESO --> BizServices
    SecretsManager --> ESO --> AIServices

    Ingress --> AuthSvc & PaymentSvc & CardSvc & LoanSvc & SupportSvc & AnalyticsSvc & GenAISvc

    PaymentSvc -.->|"gRPC ExecuteDoubleEntry"| LedgerSvc
    PaymentSvc -.->|"gRPC EvaluateRisk"| FraudSvc
    LoanSvc -.->|"gRPC EvaluateRisk"| FraudSvc

    PaymentSvc --> RDS
    OutboxWorker -->|"poll outbox_events"| RDS
    OutboxWorker ==>|"publish"| KafkaBroker
    KafkaBroker ==> NotifWorker & AnalyticsSvc

    CoreServices & BizServices & AIServices -.->|"OTLP"| OTelAgent
    OTelAgent -.->|"OTLP"| OTelGateway
    OTelGateway --> Prometheus & Loki & Jaeger
    Grafana --> Prometheus & Loki & Jaeger

    CoreServices --> RDS & Redis
    BizServices --> RDS & Redis
    GenAISvc --> RDS
```

### 2.2 Payment Transaction Sequence (Saga State Machine)

```mermaid
sequenceDiagram
    actor User
    participant GW as ALB Ingress
    participant PS as Payment Service (Go)
    participant DB as payments_db (PostgreSQL)
    participant LS as Ledger Service (Go)
    participant FS as Fraud Service (FastAPI)
    participant OW as Outbox Worker (Go)
    participant K as Kafka

    User->>GW: POST /api/payments/transfer {Idempotency-Key}
    GW->>PS: Forward + inject TraceContext

    rect rgb(240, 253, 244)
        note over PS, DB: Step 1 — Idempotency Check
        PS->>DB: SELECT WHERE idempotency_key = ? (Redis fast path first)
        alt Key exists
            DB-->>PS: Return cached result
            PS-->>GW: HTTP 200 (idempotent replay)
        end
    end

    rect rgb(239, 246, 255)
        note over PS, FS: Step 2 — Fraud Evaluation (gRPC, timeout: 15ms)
        PS->>FS: gRPC EvaluateRisk(amount, user_id, location)
        alt Fraud Score < 70
            FS-->>PS: APPROVE
        else Fraud Score ≥ 70 OR timeout
            FS-->>PS: REJECT / circuit breaker fallback to rule-based
            PS-->>GW: HTTP 422 Transaction Rejected
        end
    end

    rect rgb(255, 251, 235)
        note over PS, DB: Step 3 — Atomic DB Commit (Outbox Pattern)
        PS->>DB: BEGIN TRANSACTION
        PS->>DB: INSERT payments (status=INITIATED, idempotency_key)
        PS->>DB: INSERT outbox_events (status=PENDING, payload)
        PS->>DB: COMMIT
    end

    rect rgb(239, 246, 255)
        note over PS, LS: Step 4 — Synchronous Ledger Commit (gRPC)
        PS->>LS: gRPC ExecuteDoubleEntry(debit_account, credit_account, amount)
        alt Ledger OK
            LS-->>PS: LedgerCommitResult{ok}
            PS->>DB: UPDATE payments SET status=LEDGER_COMMITTED
        else Ledger Fail / Timeout
            PS->>DB: UPDATE payments SET status=FAILED (saga compensation)
            PS-->>GW: HTTP 500 Transaction Failed
        end
    end

    rect rgb(253, 242, 248)
        note over PS, DB: Step 5 — Final Completion
        PS->>DB: UPDATE payments SET status=COMPLETED
        PS-->>GW: HTTP 200 {transaction_id, receipt}
    end

    rect rgb(254, 252, 232)
        note over OW, K: Step 6 — Async Outbox Delivery (decoupled)
        OW->>DB: SELECT outbox_events WHERE status=PENDING
        OW->>K: Produce payment.completed event
        alt Kafka ACK
            OW->>DB: UPDATE outbox_events SET status=PROCESSED
        else Kafka fail (3 retries)
            OW->>K: Route to payment.completed.dlq
        end
    end
```

---

## 3. Mandatory Architectural Patterns & Engineering Rules

### 3.1 Transactional Outbox Pattern (Corrected Implementation)

**Key invariant**: The outbox record and the business record are written in the **same local database transaction**. The Kafka publish happens asynchronously by a separate worker — never inline in the HTTP handler.

```sql
-- outbox_events table (payments_db)
CREATE TABLE outbox_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type  TEXT NOT NULL,         -- e.g. 'payment'
    aggregate_id    UUID NOT NULL,         -- FK to payments.id
    event_type      TEXT NOT NULL,         -- e.g. 'payment.completed'
    payload         JSONB NOT NULL,
    status          TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING | PROCESSED | DEAD
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ,
    retry_count     INT NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ            -- for concurrent worker safety
);

CREATE INDEX idx_outbox_pending ON outbox_events (status, created_at)
    WHERE status = 'PENDING';
```

**Outbox Worker — concurrent-safe polling query**:
```sql
-- Atomic lock-and-fetch (prevents dual-processing with multiple workers)
WITH locked AS (
    SELECT id FROM outbox_events
    WHERE status = 'PENDING'
      AND (locked_until IS NULL OR locked_until < NOW())
    ORDER BY created_at ASC
    LIMIT 10
    FOR UPDATE SKIP LOCKED
)
UPDATE outbox_events
SET locked_until = NOW() + INTERVAL '30 seconds'
WHERE id IN (SELECT id FROM locked)
RETURNING *;
```

### 3.2 Authoritative Idempotency Engine

```sql
-- payments table constraint
ALTER TABLE payments ADD CONSTRAINT uq_payments_idempotency
    UNIQUE (idempotency_key);

-- Idempotency lookup order:
-- 1. Check Redis (fast path, TTL 24h)
-- 2. On Redis miss → SELECT from payments_db
-- 3. If Redis is DOWN → fall through directly to PostgreSQL (system stays functional)
```

### 3.3 Financial Ledger Invariants

```sql
-- ledger_entries schema
CREATE TABLE ledger_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL,
    account_id      UUID NOT NULL REFERENCES accounts(id),
    entry_type      TEXT NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount          NUMERIC(20, 4) NOT NULL CHECK (amount > 0),
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Integrity verification stored procedure (run after load tests)
CREATE OR REPLACE FUNCTION verify_ledger_integrity()
RETURNS TABLE(transaction_id UUID, sum_check NUMERIC) AS $$
    SELECT
        transaction_id,
        SUM(CASE WHEN entry_type = 'DEBIT'  THEN  amount
                 WHEN entry_type = 'CREDIT' THEN -amount
            END) AS sum_check
    FROM ledger_entries
    GROUP BY transaction_id
    HAVING ABS(SUM(CASE WHEN entry_type = 'DEBIT'  THEN  amount
                        WHEN entry_type = 'CREDIT' THEN -amount
                   END)) > 0.0001;  -- Flag non-zero-sum entries
$$ LANGUAGE SQL;
```

### 3.4 Secret Management (External Secrets Operator)

**Never store secrets in Git or Kubernetes YAML.** Use ESO to sync from AWS Secrets Manager:

```yaml
# gitops/external-secrets/payment-service-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: payment-service-secrets
  namespace: banking
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: payment-service-secrets
    creationPolicy: Owner
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: aurabank/prod/payment-service
        property: db_password
    - secretKey: REDIS_PASSWORD
      remoteRef:
        key: aurabank/prod/payment-service
        property: redis_password
```

### 3.5 API Contract Governance

- **gRPC Protobuf**: Defined in `proto/` — CI runs `buf lint` + `buf generate` to produce Go and Python stubs automatically.
- **REST OpenAPI 3.0**: Defined in `openapi/` — CI runs `spectral lint` for schema validation.
- **Breaking change policy**: Any `proto/` or `openapi/` change requires a PR label `schema-breaking` and a team review.

---

## 4. Database Migration Strategy (golang-migrate + Init Container)

Every microservice Helm chart includes an init container that runs migrations before the app starts:

```yaml
# helm/payment-service/templates/deployment.yaml (excerpt)
initContainers:
  - name: migrate
    image: migrate/migrate:v4.17.0
    args:
      - "-path=/migrations"
      - "-database=$(DATABASE_URL)"
      - "up"
    envFrom:
      - secretRef:
          name: payment-service-secrets
    volumeMounts:
      - name: migrations
        mountPath: /migrations
volumes:
  - name: migrations
    configMap:
      name: payment-service-migrations
```

**Migration file naming convention**:
```
migrations/
  000001_init_schema.up.sql
  000001_init_schema.down.sql
  000002_add_outbox_table.up.sql
  000002_add_outbox_table.down.sql
  000003_add_idempotency_index.up.sql
  000003_add_idempotency_index.down.sql
```

---

## 5. Production Kubernetes & SRE Specifications

### 5.1 Standard Pod Manifest Requirements

Every Helm chart `deployment.yaml` must include:

```yaml
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0       # Zero-downtime deploys
      maxSurge: 1
  template:
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: payment-service
      containers:
        - name: payment-service
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          startupProbe:
            httpGet: { path: /healthz/startup, port: 8080 }
            failureThreshold: 30
            periodSeconds: 2
          livenessProbe:
            httpGet: { path: /healthz/live, port: 8080 }
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet: { path: /healthz/ready, port: 8080 }
            periodSeconds: 5
            failureThreshold: 2
          securityContext:
            runAsNonRoot: true
            runAsUser: 1000
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payment-service-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: payment-service
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payment-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 75
```

### 5.2 NetworkPolicy (Default Deny + Explicit Allow)

```yaml
# helm/payment-service/templates/networkpolicy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payment-service-netpol
  namespace: banking
spec:
  podSelector:
    matchLabels:
      app: payment-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: ingress-controller
      ports:
        - port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: ledger-service
      ports:
        - port: 9090    # gRPC
    - to:
        - podSelector:
            matchLabels:
              app: fraud-service
      ports:
        - port: 9091    # gRPC
    - to:
        - namespaceSelector:
            matchLabels:
              name: database
      ports:
        - port: 5432    # PostgreSQL
    - to:
        - namespaceSelector:
            matchLabels:
              name: cache
      ports:
        - port: 6379    # Redis
    - ports:
        - port: 53      # DNS
          protocol: UDP
```

### 5.3 SRE: SLO Targets, Error Budgets & Alerting

| Service | SLI Metric | Target SLO | 30-Day Error Budget | Alertmanager Rule |
| :--- | :--- | :--- | :--- | :--- |
| **Payment API** | HTTP success rate (non-5xx) | **99.9%** | ~43 min downtime | Burn rate > 2% in 1h window |
| **Ledger gRPC** | p99 request latency | **< 150ms** | 1% slow requests allowed | p95 > 200ms sustained 5m |
| **Fraud Engine** | p95 inference latency | **< 10ms** | 5% fallback-to-rules trigger | Fallback rate > 2% for 5m |
| **Auth Service** | Successful login rate | **99.95%** | ~22 min downtime | Error rate > 0.5% in 5m |
| **Kafka Pipeline** | Consumer lag per topic | **< 500 msgs** | — | Lag > 1000 msgs for 3m |
| **OTel Gateway** | Span export success rate | **99%** | — | Drop rate > 1% for 5m |

**Prometheus SLO Recording Rules** (`monitoring/prometheus/slo-rules.yaml`):
```yaml
groups:
  - name: slo_payment_api
    interval: 30s
    rules:
      - record: job:payment_http_request_success:rate5m
        expr: |
          sum(rate(http_requests_total{job="payment-service",code!~"5.."}[5m]))
          /
          sum(rate(http_requests_total{job="payment-service"}[5m]))

      - record: job:payment_error_budget_burn_rate:1h
        expr: |
          1 - job:payment_http_request_success:rate5m

      - alert: PaymentAPIErrorBudgetBurnRate
        expr: job:payment_error_budget_burn_rate:1h > 0.02
        for: 5m
        labels:
          severity: critical
          service: payment-api
        annotations:
          summary: "Payment API error budget burning at > 2% rate"
          runbook: "https://wiki.aurabank.internal/runbooks/payment-api-error-budget"
```

### 5.4 Chaos Engineering Benchmarks (LitmusChaos)

| Experiment | Failure Injected | Expected Behavior | Target MTTR |
| :--- | :--- | :--- | :--- |
| **Pod Crash** | Terminate Payment Service pod | K8s reschedules; PDB ensures min 2 replicas active | < 20s |
| **Dependency Delay** | 500ms delay injected into Ledger Service | gRPC client timeout (300ms) triggers circuit breaker; payment returns `503` with retry hint | < 5s |
| **Broker Failure** | Kill Kafka broker | Outbox Worker retains `PENDING` events; resumes at-least-once delivery on broker recovery | < 30s |
| **Node Failure** | Drain entire AZ node | TopologySpreadConstraints shifts load to remaining 2 AZs; Karpenter provisions new nodes | < 90s |
| **DB Connection Pool Exhaustion** | Saturate PostgreSQL connection limit | Services gracefully queue; circuit breaker opens; Health endpoint returns 503 | < 10s |

---

## 6. Observability Stack Configuration

### 6.1 OTel Collector Config (Agent + Gateway Pattern)

```yaml
# monitoring/otel-collector/otel-agent-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  memory_limiter:
    check_interval: 1s
    limit_mib: 400
    spike_limit_mib: 100
  resource:
    attributes:
      - key: k8s.cluster.name
        value: "aurabank-prod"
        action: upsert

exporters:
  otlp:
    endpoint: otel-gateway.observability.svc.cluster.local:4317
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otlp]
```

```yaml
# monitoring/otel-collector/otel-gateway-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    expected_new_traces_per_sec: 1000
    policies:
      - name: always-sample-financial-critical
        type: string_attribute
        string_attribute:
          key: service.criticality
          values: ["financial", "critical"]
      - name: always-sample-errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: probabilistic-background
        type: probabilistic
        probabilistic:
          sampling_percentage: 1   # 1% of non-critical traces

  spanmetrics:
    metrics_exporter: prometheus
    latency_histogram_buckets: [1ms, 5ms, 10ms, 25ms, 50ms, 100ms, 200ms, 500ms, 1s]
    dimensions:
      - name: http.method
      - name: http.status_code
      - name: service.name
      - name: service.criticality

  batch:
    timeout: 5s
    send_batch_size: 10000

exporters:
  jaeger:
    endpoint: jaeger-collector.observability.svc.cluster.local:14250
    tls:
      insecure: true
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: otelcol
  loki:
    endpoint: http://loki.observability.svc.cluster.local:3100/loki/api/v1/push
    labels:
      resource:
        service.name: "service_name"
        k8s.namespace.name: "namespace"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling, spanmetrics, batch]
      exporters: [jaeger]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [loki]
```

---

## 7. CI/CD Pipeline (GitHub Actions — Full Spec)

```yaml
# .github/workflows/ci.yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com

jobs:
  # ── Proto Validation & Stub Generation ──────────────────────────────
  proto-lint:
    name: Protobuf Lint & Generate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: bufbuild/buf-setup-action@v1
      - run: buf lint proto/
      - run: buf generate proto/
      - uses: actions/upload-artifact@v4
        with:
          name: proto-stubs
          path: gen/

  # ── OpenAPI Schema Validation ────────────────────────────────────────
  openapi-lint:
    name: OpenAPI Spectral Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g @stoplight/spectral-cli
      - run: spectral lint openapi/*.yaml --ruleset .spectral.yaml

  # ── Matrix Lint & Test ───────────────────────────────────────────────
  test:
    name: Test (${{ matrix.service }})
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - service: ledger-service
            language: go
            path: src/ledger-service
          - service: payment-service
            language: go
            path: src/payment-service
          - service: auth-service
            language: node
            path: src/auth-service
          - service: card-service
            language: node
            path: src/card-service
          - service: ai-fraud-service
            language: python
            path: src/ai-fraud-service
    steps:
      - uses: actions/checkout@v4
      - name: Run tests (Go)
        if: matrix.language == 'go'
        run: |
          cd ${{ matrix.path }}
          go test ./... -race -coverprofile=coverage.out
          go tool cover -func=coverage.out
      - name: Run tests (Node.js)
        if: matrix.language == 'node'
        run: |
          cd ${{ matrix.path }}
          npm ci && npm run lint && npm test
      - name: Run tests (Python)
        if: matrix.language == 'python'
        run: |
          cd ${{ matrix.path }}
          pip install -r requirements.txt
          pytest tests/ --cov --cov-fail-under=70

  # ── Security Scanning ────────────────────────────────────────────────
  security:
    name: Security Scan (${{ matrix.service }})
    needs: test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [ledger-service, payment-service, auth-service, card-service, ai-fraud-service, genai-advisor-service]
    steps:
      - uses: actions/checkout@v4
      - name: Build image for scanning
        run: docker build -t ${{ matrix.service }}:scan src/${{ matrix.service }}
      - name: Trivy vulnerability scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ matrix.service }}:scan
          format: sarif
          output: trivy-${{ matrix.service }}.sarif
          severity: CRITICAL,HIGH
          exit-code: '1'
      - name: SonarQube SAST
        uses: sonarsource/sonarqube-scan-action@master
        with:
          projectBaseDir: src/${{ matrix.service }}
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}

  # ── Helm Chart Lint & Test ───────────────────────────────────────────
  helm-lint:
    name: Helm Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/setup-helm@v3
      - run: |
          for chart in helm/*/; do
            echo "Linting $chart"
            helm lint $chart --strict
          done
      - name: Helm template validation
        run: |
          for chart in helm/*/; do
            helm template test $chart --validate
          done

  # ── Docker Build & Push (main branch only) ──────────────────────────
  build-push:
    name: Build & Push (${{ matrix.service }})
    needs: [proto-lint, openapi-lint, test, security, helm-lint]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [ledger-service, payment-service, auth-service, card-service, loan-service, support-service, analytics-service, ai-fraud-service, genai-advisor-service, outbox-worker, notification-worker]
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}
      - uses: aws-actions/amazon-ecr-login@v2
      - name: Build and push
        run: |
          IMAGE_TAG="${{ env.ECR_REGISTRY }}/aurabank/${{ matrix.service }}:${{ github.sha }}"
          docker build -t $IMAGE_TAG src/${{ matrix.service }}
          docker push $IMAGE_TAG
          # Update Helm values.yaml with new image tag
          sed -i "s|tag:.*|tag: ${{ github.sha }}|g" helm/${{ matrix.service }}/values.yaml
      - name: Commit updated Helm values
        run: |
          git config user.name "github-actions"
          git config user.email "actions@github.com"
          git add helm/${{ matrix.service }}/values.yaml
          git commit -m "ci: update ${{ matrix.service }} image to ${{ github.sha }}" || exit 0
          git push

  # ── ArgoCD Sync (ArgoCD will auto-detect the Helm values change) ────
  # ArgoCD auto-sync handles deployment — no explicit sync step needed.
  # The Helm values.yaml commit above triggers ArgoCD's Git polling.
```

---

## 8. Cost Management (AWS Budget Controls)

```yaml
# terraform/modules/budget/main.tf
resource "aws_budgets_budget" "monthly_eks_budget" {
  name         = "aurabank-monthly-budget"
  budget_type  = "COST"
  limit_amount = "150"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["your-email@example.com"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["your-email@example.com"]
  }
}
```

```yaml
# .github/workflows/cluster-teardown.yaml
# Auto-teardown EKS cluster on weeknights to save costs
name: Scheduled Cluster Teardown
on:
  schedule:
    - cron: '0 20 * * 1-5'   # 8 PM weekdays (adjust to your timezone)
  workflow_dispatch:
    inputs:
      action:
        description: 'up or down'
        required: true

jobs:
  manage-cluster:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1
      - name: Scale down EKS node group
        run: |
          aws eks update-nodegroup-config \
            --cluster-name aurabank-prod \
            --nodegroup-name main \
            --scaling-config minSize=0,maxSize=10,desiredSize=0
```

---

## 9. Local Development Environment (Zero-Cost)

```yaml
# docker-compose.local.yaml — mirrors AWS services locally
version: "3.9"
services:
  # Kafka (mirrors Strimzi on EKS)
  kafka:
    image: confluentinc/cp-kafka:7.6.0
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  # LocalStack (mirrors AWS S3/ECR/Secrets Manager)
  localstack:
    image: localstack/localstack:3.0
    environment:
      SERVICES: s3,ecr,secretsmanager
      AWS_DEFAULT_REGION: us-east-1
    ports:
      - "4566:4566"

  # PostgreSQL (mirrors RDS)
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_USER: aurabank
      POSTGRES_PASSWORD: local_dev_password
    volumes:
      - ./scripts/init-dbs.sql:/docker-entrypoint-initdb.d/init.sql

  # Redis (mirrors ElastiCache)
  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

  # MLflow
  mlflow:
    image: ghcr.io/mlflow/mlflow:v2.11.0
    command: mlflow server --host 0.0.0.0 --port 5002 --backend-store-uri postgresql://aurabank:local_dev_password@postgres/mlflow_db

  # OTel Collector (single instance locally, mirrors agent+gateway)
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.95.0
    volumes:
      - ./monitoring/otel-collector/local-config.yaml:/etc/otel/config.yaml
    command: ["--config=/etc/otel/config.yaml"]

  # Jaeger
  jaeger:
    image: jaegertracing/all-in-one:1.54
    ports:
      - "16686:16686"

  # Prometheus
  prometheus:
    image: prom/prometheus:v2.49.1
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml

  # Grafana
  grafana:
    image: grafana/grafana:10.3.1
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    ports:
      - "3001:3000"
```

---

## 10. Revised 5-Phase Implementation Roadmap

```mermaid
gantt
    title AuraBank — 5-Phase Engineering Roadmap
    dateFormat  YYYY-MM-DD

    section Phase 0: Local Foundation
    Monolith audit + Docker Compose local stack  :p0_1, 2026-09-01, 7d
    Baseline integration tests on monolith       :p0_2, after p0_1, 3d

    section Phase 1: Cloud Platform & IaC
    Terraform VPC, EKS, RDS, ECR, S3, Budgets   :p1_1, 2026-09-11, 14d
    GitHub Actions CI (matrix test, Trivy, Helm) :p1_2, 2026-09-11, 7d
    ArgoCD install + GitOps repo structure       :p1_3, after p1_1, 7d
    ESO + AWS Secrets Manager wiring             :p1_4, after p1_3, 5d

    section Phase 2: Core Banking Services
    Extract Auth Service (Node.js, JWT, KYC)     :p2_1, 2026-10-06, 14d
    Extract Ledger Service (Go, double-entry)    :p2_2, 2026-10-06, 14d
    Build Payment Service (Go, Outbox, gRPC)     :p2_3, after p2_1, 21d
    Implement Outbox Worker + DLQ                :p2_4, after p2_3, 7d
    Notification Worker (Go, Kafka consumer)     :p2_5, after p2_4, 7d
    golang-migrate schema init for all services  :p2_6, 2026-10-06, 7d

    section Phase 3: Business Services
    Card Service (Node.js)                       :p3_1, 2026-11-17, 14d
    Loan Service (Go)                            :p3_2, 2026-11-17, 14d
    Support Service (Node.js)                   :p3_3, 2026-11-17, 14d
    Analytics Service (Go)                       :p3_4, 2026-11-17, 14d

    section Phase 4: Observability + K8s Hardening
    OTel Agent DaemonSet + Gateway               :p4_1, 2026-12-15, 14d
    Jaeger + Loki + Prometheus SLO dashboards    :p4_2, after p4_1, 10d
    NetworkPolicies + PDB + Karpenter + HPA      :p4_3, 2026-12-15, 14d
    LitmusChaos experiments + MTTR benchmarks    :p4_4, after p4_3, 10d
    k6 load tests (5,000 RPS) + ledger verify    :p4_5, after p4_2, 7d

    section Phase 5: AI & MLOps
    Flask→FastAPI migration + gRPC stubs         :p5_1, 2027-01-19, 7d
    XGBoost fraud model + MLflow + drift alerts  :p5_2, after p5_1, 14d
    GenAI RAG advisor (pgvector + MiniLM)        :p5_3, after p5_2, 14d
    Circuit breaker + fallback policy for AI     :p5_4, after p5_3, 5d
```

---

## 11. Verification & Validation Strategy

### 11.1 Financial Integrity Verification
```bash
# After k6 load test at 5,000 RPS for 10 minutes:
psql -h $LEDGER_DB_HOST -U aurabank -d ledger_db \
  -c "SELECT * FROM verify_ledger_integrity();"
# Expected: 0 rows returned (all entries sum to zero)
```

### 11.2 Idempotency Verification
```bash
# Send duplicate payment request 100 times with same Idempotency-Key
# Expected: all 100 return HTTP 200 with identical body, 0 duplicate DB rows
k6 run scripts/idempotency-replay-test.js
```

### 11.3 Outbox Resilience Verification
```bash
# 1. Start load test (payments flowing)
# 2. Kill Kafka broker: kubectl delete pod kafka-0 -n kafka
# 3. Verify outbox_events accumulate with status=PENDING
# 4. Restore Kafka: kubectl rollout restart statefulset/kafka -n kafka
# 5. Verify all PENDING events transition to PROCESSED with zero loss
```

### 11.4 AI Fallback Verification
```bash
# Kill fraud service during live payment traffic:
kubectl delete pod -l app=fraud-service -n banking
# Expected: Payment service falls back to rule-based scoring
# Verify via Grafana: fraud_fallback_total counter increments
# Verify: no payments fail due to fraud service unavailability
```

### 11.5 Chaos Experiment Results Template
Document results in `chaos-results/` directory:
```markdown
# Chaos Experiment: Pod Crash — Payment Service
Date: YYYY-MM-DD
Baseline RPS: 1,000
Result: MTTR = Xs (target < 20s)
Evidence: Jaeger trace gap, Prometheus alert firing time, Grafana screenshot
```
