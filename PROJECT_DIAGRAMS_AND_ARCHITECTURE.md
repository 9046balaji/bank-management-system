# 📐 AuraBank — Full Project Architecture & System Diagrams

<div align="center">

![Architecture Banner](https://img.shields.io/badge/AURABANK-COMPLETE_ARCHITECTURE_&_DIAGRAMS-135bec?style=for-the-badge&logo=mermaid)

**Comprehensive visual engineering blueprint featuring end-to-end Mermaid diagrams for Microservices, Double-Entry Accounting Ledger ERD, Transaction Data Flow, AI/ML Inference Pipeline, OpenTelemetry Observability Mesh, and GitOps CI/CD.**

</div>

---

## 📑 Table of Contents
1. [🏗️ 1. High-Level Microservices System Architecture](#️-1-high-level-microservices-system-architecture)
2. [🗄️ 2. Database & Double-Entry Ledger Entity Relationship Diagram (ERD)](#️-2-database--double-entry-ledger-entity-relationship-diagram-erd)
3. [💸 3. Money Transfer & Transactional Outbox Sequence Diagram](#-3-money-transfer--transactional-outbox-sequence-diagram)
4. [🤖 4. AI Fraud & ML Risk Scoring Pipeline Sequence Diagram](#-4-ai-fraud--ml-risk-scoring-pipeline-sequence-diagram)
5. [📊 5. OpenTelemetry Observability & Telemetry Mesh Diagram](#-5-opentelemetry-observability--telemetry-mesh-diagram)
6. [🔄 6. CI/CD Automated Build & Deployment Flowchart](#-6-cicd-automated-build--deployment-flowchart)
7. [🐳 7. Docker Container Network & Storage Topology](#-7-docker-container-network--storage-topology)

---

## 🏗️ 1. High-Level Microservices System Architecture

This diagram illustrates the complete domain-decoupled microservices architecture of AuraBank, showing how traffic flows from the browser SPA down to microservices, databases, event streaming, and monitoring layers.

```mermaid
graph TB
    subgraph ClientLayer["📱 Client Presentation Layer"]
        SPA["React 18 SPA (Vite / TypeScript)<br/>Port 3000"]
    end

    subgraph GatewayLayer["🛡️ API Gateway & Auth Layer"]
        Gateway["Backend REST API (Node.js / Express)<br/>Port 5000"]
        AuthMiddleware["JWT & Security Middleware<br/>Rate Limiting & Idempotency"]
    end

    subgraph CoreServices["⚙️ Microservices & Logic"]
        UserSvc["User & KYC Service"]
        AccountSvc["Account & Balance Service"]
        TransferSvc["Transfer & Ledger Service"]
        LoanSvc["Loan & Credit Service"]
        CardSvc["Cards Management Service"]
        AISvc["Python AI/ML Risk Engine (Flask/FastAPI)<br/>Port 5001"]
    end

    subgraph DataStore["🗄️ Persistence & Caching Layer"]
        Postgres[("PostgreSQL 15 DB<br/>Double-Entry Ledger & Schemas")]
        Redis[("Redis 7 Cache<br/>Session Locks & Fast-Path")]
    end

    subgraph EventStream["⚡ Event-Driven Infrastructure"]
        Kafka["Apache Kafka (KRaft Mode)<br/>Port 9092 / 29092"]
        KafkaUI["Kafka UI Manager<br/>Port 8090"]
        LocalStack["LocalStack 3.0 (AWS S3/ECR Mock)<br/>Port 4566"]
        MLflow["MLflow Model Registry<br/>Port 5002"]
    end

    subgraph TelemetryMesh["📊 Observability & SRE Mesh"]
        OTelCol["OTel Collector<br/>Ports 4317 / 4318"]
        Prometheus["Prometheus TSDB<br/>Port 9090"]
        Grafana["Grafana Dashboards<br/>Port 3001"]
        Jaeger["Jaeger Tracing<br/>Port 16686"]
        Loki["Loki Log Aggregator<br/>Port 3100"]
    end

    SPA -->|HTTP / REST| Gateway
    Gateway --> AuthMiddleware
    AuthMiddleware --> UserSvc
    AuthMiddleware --> AccountSvc
    AuthMiddleware --> TransferSvc
    AuthMiddleware --> LoanSvc
    AuthMiddleware --> CardSvc

    TransferSvc -->|HTTP / gRPC| AISvc
    LoanSvc -->|HTTP / gRPC| AISvc

    UserSvc --> Postgres
    AccountSvc --> Postgres
    TransferSvc --> Postgres
    TransferSvc --> Redis

    TransferSvc -->|Transactional Outbox| Kafka
    Kafka --> KafkaUI
    AISvc --> LocalStack
    AISvc --> MLflow

    Gateway -.->|OTLP Spans & Metrics| OTelCol
    AISvc -.->|OTLP Spans & Metrics| OTelCol
    OTelCol --> Prometheus
    OTelCol --> Jaeger
    Gateway -.->|Logs| Loki
    Prometheus --> Grafana
    Loki --> Grafana
```

---

## 🗄️ 2. Database & Double-Entry Ledger Entity Relationship Diagram (ERD)

AuraBank uses strict **double-entry bookkeeping** where every transaction creates balanced debit and credit entries (`DEBIT + CREDIT = 0`).

```mermaid
erDiagram
    USERS ||--o{ ACCOUNTS : owns
    USERS ||--o{ CARDS : holds
    USERS ||--o{ LOANS : applies
    ACCOUNTS ||--o{ TRANSACTIONS : initiates
    TRANSACTIONS ||--|{ LEDGER_ENTRIES : generates
    TRANSACTIONS ||--o| FRAUD_LOGS : evaluated_by

    USERS {
        uuid id PK
        string email UK
        string password_hash
        string first_name
        string last_name
        string role
        string status
        timestamp created_at
    }

    ACCOUNTS {
        uuid id PK
        uuid user_id FK
        string account_number UK
        string account_type
        decimal balance
        string currency
        string status
        timestamp created_at
    }

    CARDS {
        uuid id PK
        uuid user_id FK
        uuid account_id FK
        string card_number_masked
        string card_type
        decimal spending_limit
        boolean is_frozen
        string pin_hash
    }

    LOANS {
        uuid id PK
        uuid user_id FK
        decimal amount
        decimal interest_rate
        integer term_months
        decimal monthly_payment
        string status
        float ai_risk_score
    }

    TRANSACTIONS {
        uuid id PK
        uuid from_account_id FK
        uuid to_account_id FK
        decimal amount
        string category
        string status
        string reference_id UK
        string idempotency_key UK
        timestamp created_at
    }

    LEDGER_ENTRIES {
        uuid id PK
        uuid transaction_id FK
        uuid account_id FK
        string entry_type
        decimal amount
        timestamp created_at
    }

    FRAUD_LOGS {
        uuid id PK
        uuid transaction_id FK
        float risk_score
        string decision
        string flags
        timestamp evaluated_at
    }
```

---

## 💸 3. Money Transfer & Transactional Outbox Sequence Diagram

This sequence diagram demonstrates what happens during a user transfer: from client request, idempotency verification, PostgreSQL transaction commit, transactional outbox publishing to Kafka, and async notification.

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Customer Browser
    participant Gateway as 🛡️ Express API Gateway
    participant Redis as ⚡ Redis Lock Cache
    participant DB as 🗄️ PostgreSQL DB
    participant Outbox as 📤 Outbox Poller
    participant Kafka as ⚡ Apache Kafka
    participant AI as 🤖 Python AI Risk Engine

    User->>Gateway: POST /api/transactions/transfer (Header: Idempotency-Key)
    Gateway->>Redis: SETNX idempotency_key (Locking for 30s)
    alt Key Already Processed
        Redis-->>Gateway: Key Exists (Return cached response)
        Gateway-->>User: HTTP 200 (Cached Transaction Receipt)
    else Key Is New
        Gateway->>AI: POST /predict-fraud (amount, accounts)
        AI-->>Gateway: Return Risk Score = 12 (APPROVE)
        
        rect rgb(240, 248, 255)
            Note over Gateway,DB: Atomic Database Transaction Begins
            Gateway->>DB: BEGIN TRANSACTION
            Gateway->>DB: UPDATE ACCOUNTS SET balance = balance - amount WHERE id = sender
            Gateway->>DB: UPDATE ACCOUNTS SET balance = balance + amount WHERE id = receiver
            Gateway->>DB: INSERT INTO ledger_entries (DEBIT & CREDIT)
            Gateway->>DB: INSERT INTO outbox (event_type: 'TRANSFER_COMPLETED')
            Gateway->>DB: COMMIT TRANSACTION
        end

        Gateway->>Redis: Store completed response payload
        Gateway-->>User: HTTP 200 (Success - Reference ID: TXN_98765)

        par Background Async Outbox Worker
            Outbox->>DB: SELECT * FROM outbox WHERE status = 'PENDING' FOR UPDATE SKIP LOCKED
            Outbox->>Kafka: Publish event to topic 'transaction-events'
            Outbox->>DB: UPDATE outbox SET status = 'PROCESSED'
        end
    end
```

---

## 🤖 4. AI Fraud & ML Risk Scoring Pipeline Sequence Diagram

This diagram shows how the Python AI Engine processes incoming fraud check requests, extracts feature sets, applies machine learning models (XGBoost & Scikit-Learn TF-IDF), and logs feedback data for retraining.

```mermaid
sequenceDiagram
    autonumber
    participant App as 🛡️ Backend Microservice
    participant Engine as 🐍 Python AI Engine (Flask / FastAPI)
    participant TFIDF as 🔤 TF-IDF Categorizer (Scikit-Learn)
    participant XGBoost as 🌲 XGBoost Fraud Model
    participant Fallback as ⚙️ Deterministic Rule Engine
    participant MLflow as 🧪 MLflow Tracking Server

    App->>Engine: POST /predict-fraud (transaction_payload)
    Engine->>TFIDF: Transform description ➔ Feature Vector
    TFIDF-->>Engine: Category: "Dining / Restaurants" (Confidence: 94%)
    
    Engine->>XGBoost: Predict Risk Score (amount, time_delta, velocity)
    alt Model Healthy
        XGBoost-->>Engine: Fraud Probability = 0.04 (Score: 4/100)
    else Model Error / Timeout
        Engine->>Fallback: Evaluate Safety Heuristics (amount > $10,000?)
        Fallback-->>Engine: Fallback Decision = "FLAGGED_FOR_REVIEW"
    end

    Engine->>MLflow: Log prediction metric & inference latency
    Engine-->>App: Return JSON { risk_score: 4, category: "Dining", decision: "APPROVE" }
```

---

## 📊 5. OpenTelemetry Observability & Telemetry Mesh Diagram

Full observability mesh showing how metrics, logs, and distributed traces are collected, aggregated, and visualized across Grafana, Prometheus, Jaeger, and Loki.

```mermaid
graph LR
    subgraph Workloads["⚙️ System Microservices"]
        BackendNode["Backend API Node.js"]
        AIPython["AI Risk Engine Python"]
        cAdvisorContainer["cAdvisor Container Monitor"]
        NodeExp["Node Exporter System Monitor"]
    end

    subgraph TelemetryCollector["📡 OpenTelemetry Collector"]
        ReceiverOTLP["OTLP Receiver (Ports 4317 / 4318)"]
        Processor["Batch Processor & SpanMetrics"]
        ExporterProm["Prometheus Exporter (Port 8889)"]
        ExporterJaeger["Jaeger gRPC Exporter"]
    end

    subgraph StorageMesh["💾 Storage & Indexing Engine"]
        PrometheusDB["Prometheus Time-Series DB"]
        JaegerDB["Jaeger Tracing Engine"]
        LokiDB["Loki Log Store"]
    end

    subgraph Visualization["🖥️ Dashboards & Alerting"]
        GrafanaUI["Grafana Dashboards (Port 3001)"]
        AlertMgr["Alertmanager Notification Dispatch"]
    end

    BackendNode -->|Traces & Metrics| ReceiverOTLP
    AIPython -->|Traces & Metrics| ReceiverOTLP
    cAdvisorContainer -->|Scraped Metrics| PrometheusDB
    NodeExp -->|Scraped Metrics| PrometheusDB
    BackendNode -->|Container Logs| LokiDB

    ReceiverOTLP --> Processor
    Processor --> ExporterProm
    Processor --> ExporterJaeger

    ExporterProm --> PrometheusDB
    ExporterJaeger --> JaegerDB

    PrometheusDB --> AlertMgr
    PrometheusDB --> GrafanaUI
    JaegerDB --> GrafanaUI
    LokiDB --> GrafanaUI
```

---

## 🔄 6. CI/CD Automated Build & Deployment Flowchart

GitHub Actions pipeline flow showing automated linting, test matrices, Docker image build validation, and automated publishing to GitHub Container Registry (`ghcr.io`).

```mermaid
flowchart TD
    Start([Push to main / PR Created]) --> Checkout[git checkout repository]

    subgraph ParallelValidation["⚡ Parallel Validation Stage"]
        Checkout --> ProtoLint["Buf Protobuf Lint & Generate<br/>(github_token authenticated)"]
        Checkout --> SpectralLint["OpenAPI Spectral Lint<br/>(spectral-cli v6.11.1)"]
        Checkout --> MatrixTest["Matrix Unit Tests<br/>(Node 20 + Python 3.11)"]
        Checkout --> HelmLint["Azure Helm Chart Lint<br/>(azure/setup-helm@v4)"]
    end

    ProtoLint --> AllValidated{All Validation Passed?}
    SpectralLint --> AllValidated
    MatrixTest --> AllValidated
    HelmLint --> AllValidated

    AllValidated -- No --> FailCI([❌ CI Pipeline Failed])
    AllValidated -- Yes --> DockerBuild["Docker Build Validation<br/>(BuildKit Cache)"]

    DockerBuild --> IsMainBranch{Is Push to Main Branch?}

    IsMainBranch -- No (PR) --> SuccessPR([✅ PR Checks Succeeded])
    IsMainBranch -- Yes --> LoginGHCR[Log in to GitHub Container Registry ghcr.io]

    LoginGHCR --> TagImages[Generate Image Tags: sha-commit & latest]
    TagImages --> PushImages[Push backend, ai-service, frontend to GHCR]
    PushImages --> SuccessCD([🚀 CD Deployment Ready])
```

---

## 🐳 7. Docker Container Network & Storage Topology

Shows the isolated bridge networks, host port bindings, and volume mounts defined across `docker-compose.yml` and `docker-compose.local.yaml`.

```mermaid
graph TD
    subgraph HostPorts["🌐 Host Operating System (Local Ports)"]
        Port3000["Port 3000 (Web App)"]
        Port5000["Port 5000 (Backend API)"]
        Port5001["Port 5001 (AI Engine)"]
        Port3001["Port 3001 (Grafana)"]
        Port8090["Port 8090 (Kafka UI)"]
        Port9090["Port 9090 (Prometheus)"]
        Port16686["Port 16686 (Jaeger UI)"]
    end

    subgraph DockerBridge["🐳 Docker Bridge Network (aurabank-network / aurabank-local)"]
        FrontendC["aurabank-frontend (Nginx)"]
        BackendC["aurabank-backend (Express)"]
        AIC["aurabank-ai-service (Flask)"]
        DBC["aurabank-db (PostgreSQL 15)"]
        RedisC["aurabank-redis (Redis 7)"]
        KafkaC["aurabank-kafka (KRaft)"]
        LocalStackC["aurabank-localstack (AWS Mock)"]
        GrafanaC["aurabank-grafana"]
        PromC["aurabank-prometheus"]
        JaegerC["aurabank-jaeger"]
        BackupC["aurabank-pg-backup (Cron Dump)"]
    end

    subgraph PersistentVolumes["💾 Named Docker Volumes"]
        VolPG[("postgres_data")]
        VolRedis[("redis_data")]
        VolProm[("prometheus_data")]
        VolGrafana[("grafana_data")]
        VolBackups[("pg_backups")]
    end

    Port3000 --> FrontendC
    Port5000 --> BackendC
    Port5001 --> AIC
    Port3001 --> GrafanaC
    Port8090 --> KafkaC
    Port9090 --> PromC
    Port16686 --> JaegerC

    FrontendC --> BackendC
    BackendC --> DBC
    BackendC --> RedisC
    BackendC --> AIC
    BackendC --> KafkaC
    AIC --> LocalStackC

    DBC --- VolPG
    RedisC --- VolRedis
    PromC --- VolProm
    GrafanaC --- VolGrafana
    BackupC --- VolBackups
    BackupC --> DBC
```

---

<div align="center">

**AuraBank Visual Architecture Reference** • Maintained by [@9046balaji](https://github.com/9046balaji)

</div>
