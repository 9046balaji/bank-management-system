# 📐 System Design & Architecture Diagrams Guide

> **AuraBank Platform — Interview Architecture Reference**

---

## 🏗️ 1. Complete System Microservices Architecture

```mermaid
graph TB
    subgraph ClientLayer["🌐 Client Presentation Layer"]
        Browser["React 18 SPA (Nginx)<br/>Port 3000"]
    end

    subgraph GatewayLayer["🛡️ API Gateway & Auth"]
        ExpressBackend["Node.js Express Backend API<br/>Port 5000"]
    end

    subgraph Microservices["⚙️ Microservices Domain Layer"]
        UserSvc["1. User & Auth Service"]
        AccountSvc["2. Account & Balance Service"]
        TransferSvc["3. Transfer & Ledger Service"]
        LoanSvc["4. Loans & Credit Service"]
        CardSvc["5. Cards Management Service"]
        SupportSvc["6. Support & Chat Service"]
        AnalyticsSvc["7. Analytics Service"]
        AIService["8. Python AI & ML Risk Engine<br/>Port 5001"]
    end

    subgraph StorageLayer["🗄️ Persistence & Messaging"]
        Postgres[("PostgreSQL 15 DB<br/>Double-Entry Ledger & Schemas")]
        Redis[("Redis 7 Cache<br/>Idempotency Locks & Fast-Path")]
        Kafka["Apache Kafka (KRaft Mode)<br/>Port 9092 / 8090 UI"]
        LocalStack["LocalStack 3.0 (AWS S3/ECR Mock)<br/>Port 4566"]
    end

    subgraph ObservabilityLayer["📊 Telemetry & SRE Mesh"]
        OTelCol["OTel Collector (4317 / 4318)"]
        Prometheus["Prometheus TSDB (9090)"]
        Grafana["Grafana Dashboards (3001)"]
        Jaeger["Jaeger Tracing (16686)"]
        Loki["Loki Log Store (3100)"]
    end

    Browser -->|HTTP REST| ExpressBackend
    ExpressBackend --> UserSvc
    ExpressBackend --> AccountSvc
    ExpressBackend --> TransferSvc
    ExpressBackend --> LoanSvc
    ExpressBackend --> CardSvc
    ExpressBackend --> SupportSvc
    ExpressBackend --> AnalyticsSvc

    TransferSvc -->|HTTP / gRPC Risk Check| AIService
    LoanSvc -->|HTTP / gRPC Risk Check| AIService

    UserSvc --> Postgres
    AccountSvc --> Postgres
    TransferSvc --> Postgres
    TransferSvc --> Redis
    TransferSvc -->|Outbox Events| Kafka

    AIService --> LocalStack

    ExpressBackend -.->|Spans & Metrics| OTelCol
    AIService -.->|Spans & Metrics| OTelCol
    OTelCol --> Prometheus
    OTelCol --> Jaeger
    ExpressBackend -.->|Logs| Loki
    Prometheus --> Grafana
    Loki --> Grafana
```

---

## 💸 2. Money Transfer Execution Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Customer Browser
    participant FE as 📱 Frontend (React)
    participant BE as 🛡️ Express Gateway
    participant Redis as ⚡ Redis Lock
    participant AI as 🤖 Python AI Risk Engine
    participant DB as 🗄️ PostgreSQL DB
    participant Outbox as 📤 Outbox Worker
    participant Kafka as ⚡ Apache Kafka

    User->>FE: Click "Send $500 Transfer"
    FE->>BE: POST /api/transactions/transfer (Idempotency-Key: "uuid-1234")
    BE->>Redis: SETNX idempotency_key (30s Lock)
    alt Lock Exists (Duplicate Request)
        Redis-->>BE: Lock Active
        BE-->>FE: Return cached transaction receipt
    else Lock Acquired
        BE->>AI: POST /predict-fraud { amount: 500, sender, receiver }
        AI-->>BE: Return Risk Score = 8/100 (APPROVE)

        rect rgb(240, 248, 255)
            Note over BE,DB: Atomic Database Transaction
            BE->>DB: BEGIN TRANSACTION
            BE->>DB: Deduct $500 from Sender Balance
            BE->>DB: Credit $500 to Receiver Balance
            BE->>DB: INSERT INTO ledger_entries (DEBIT & CREDIT)
            BE->>DB: INSERT INTO outbox (event: TRANSFER_COMPLETED)
            BE->>DB: COMMIT TRANSACTION
        end

        BE->>Redis: Store completed HTTP response payload
        BE-->>FE: HTTP 200 OK { reference_id: TXN_98765 }
        FE-->>User: Display Receipt & Update Balance

        par Async Background Event Dispatch
            Outbox->>DB: SELECT * FROM outbox WHERE status = 'PENDING' FOR UPDATE SKIP LOCKED
            Outbox->>Kafka: Publish event to topic 'transaction-events'
            Outbox->>DB: UPDATE outbox SET status = 'PROCESSED'
        end
    end
```

---

## 📊 3. Telemetry Collection & Observability Flow

```mermaid
sequenceDiagram
    autonumber
    participant App as ⚙️ Microservices (Node / Python)
    participant OTel as 📡 OpenTelemetry Collector
    participant Prom as 📊 Prometheus TSDB
    participant Jaeger as 🕵️ Jaeger Tracing
    participant Grafana as 🖥️ Grafana Dashboards

    App->>OTel: Send metrics & trace spans over OTLP gRPC (Port 4317)
    OTel->>Prom: Expose metrics on PromExporter endpoint (Port 8889)
    OTel->>Jaeger: Forward trace spans via gRPC
    Prom->>Prom: Scrape metrics every 10 seconds
    Grafana->>Prom: PromQL Queries for CPU, RAM, & Throughput
    Grafana->>Jaeger: TraceID lookup for request waterfalls
    Grafana-->>SRE: Display unified operational dashboards
```
