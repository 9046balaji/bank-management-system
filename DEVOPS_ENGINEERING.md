# 🏗️ AuraBank — End-to-End Microservices Architecture & Interview Blueprint

<div align="center">

![DevOps Banner](https://img.shields.io/badge/DEVOPS-SYSTEM_DESIGN_BLUEPRINT-FF9900?style=for-the-badge&logo=kubernetes)

**Complete Production Blueprint & Technical Interview Guide covering Microservices Decomposition, Double-Entry Accounting Ledger, Transactional Outbox, Machine Learning Fraud Engine, OpenTelemetry Mesh, and System Design Interview Scripts.**

</div>

---

## 📑 Table of Contents
1. [📐 System Architecture & Microservices Decomposition](#-1-system-architecture--microservices-decomposition)
2. [🔄 End-to-End Transaction Execution Flow](#-2-end-to-end-transaction-execution-flow)
3. [⚡ Core Architectural Design Patterns](#-3-core-architectural-design-patterns)
4. [🛠️ Infrastructure Component Stack](#️-4-infrastructure-component-stack)
5. [🔐 Security Hardening & Secret Isolation](#-5-security-hardening--secret-isolation)
6. [🔁 CI/CD Pipeline & GitOps Automation](#-6-cicd-pipeline--gitops-automation)
7. [🎤 System Design & DevOps Interview Guide](#-7-system-design--devops-interview-guide)

---

## 📐 1. System Architecture & Microservices Decomposition

AuraBank is built as a domain-decoupled, event-driven microservices platform consisting of **9 specialized services**:

```
                                  ┌───────────────────────────┐
                                  │   AuraBank Web Frontend   │
                                  │  (React 18 + TypeScript)  │
                                  └─────────────┬─────────────┘
                                                │ REST / JSON
                                                ▼
 ┌─────────────────────────────────────────────────────────────────────────────────────────┐
 │                               Backend Microservices (Node.js)                            │
 ├───────────────────┬───────────────────┬───────────────────┬─────────────────────────────┤
 │ 1. User & Auth    │ 2. Account &      │ 3. Transactions & │ 4. Loans & Credit           │
 │    Service        │    Ledger Service │    Payments       │    Service                  │
 ├───────────────────┼───────────────────┼───────────────────┼─────────────────────────────┤
 │ 5. Cards          │ 6. Customer       │ 7. Analytics &    │ 8. ML Gateway               │
 │    Management     │    Support Desk   │    Reporting      │    Proxy                    │
 └───────────────────┴─────────┬─────────┴─────────┬─────────┴─────────────────────────────┘
                               │                   │
                  gRPC / HTTP  │                   │ PostgreSQL / Redis / Kafka
                               ▼                   ▼
                 ┌──────────────────────────┐  ┌──────────────────────────────────────────┐
                 │ 9. Python AI & ML Engine │  │ Infrastructure Services                  │
                 │    (XGBoost + Scikit)    │  │ (Postgres, Redis, Kafka, LocalStack, OTel)│
                 └──────────────────────────┘  └──────────────────────────────────────────┘
```

### Detailed Microservices Catalog:

| # | Microservice | Tech Stack | Role & Function in AuraBank |
|---| :--- | :--- | :--- |
| **1** | **Frontend SPA** | React 18, TypeScript, Vite | Client portal (`port 3000`) for account management, transfers, card controls, AI loan applications, and live chat. |
| **2** | **User & Auth Service** | Node.js, Express, JWT | Registration, KYC verification, PIN security, role-based authorization (`USER` vs `ADMIN`). |
| **3** | **Account & Balance Service** | Node.js, PostgreSQL | Manages checking/savings accounts, balance queries, and account allocation. |
| **4** | **Transaction & Ledger Service** | Node.js, PostgreSQL, Redis | Core money engine. Enforces double-entry ledger rules ($\sum \text{DEBIT} + \sum \text{CREDIT} = 0$), idempotency locks, and outbox event creation. |
| **5** | **Loans & Credit Service** | Node.js, Express | Manages personal loan applications, EMI repayment schedules, and admin approval workflows. |
| **6** | **Cards Management Service** | Node.js, Express | Physical/virtual card issuance, spending limits, card locking, and PIN updates. |
| **7** | **Customer Support & Chat Service** | Node.js, WebSearch | Customer help desk, support tickets, and AI-assisted financial advice chatbot. |
| **8** | **Analytics & Reporting Service** | Node.js, Recharts | Aggregates transaction spending categories, monthly cashflow metrics, and admin analytics. |
| **9** | **Python AI & ML Risk Engine** | Python 3.11, Flask, XGBoost | ML Microservice (`port 5001`). Real-time fraud scoring (`/predict-fraud`), loan risk evaluation (`/predict-loan-risk`), and Scikit-Learn TF-IDF expense categorization. |

---

## 🔄 2. End-to-End Transaction Execution Flow

Here is the exact step-by-step lifecycle when a user initiates a **$500 wire transfer**:

```
[Customer Frontend]
       │ 1. POST /api/transactions/transfer (Idempotency-Key: "uuid-1234")
       ▼
[Express API Gateway]
       │ 2. Check Redis for "uuid-1234" (Lock key for 30s)
       ├───> If already processed ➔ Return cached transaction receipt
       │
       │ 3. Call Python AI Risk Engine (/predict-fraud)
       ├───> Evaluates transaction amount, velocity, & account age
       ├───> Returns Risk Score: 8/100 (Decision: APPROVE)
       │
       │ 4. Open Atomic PostgreSQL Transaction (BEGIN)
       ├───> UPDATE accounts SET balance = balance - 500 WHERE id = sender
       ├───> UPDATE accounts SET balance = balance + 500 WHERE id = receiver
       ├───> INSERT INTO ledger_entries (DEBIT sender $500, CREDIT receiver $500)
       ├───> INSERT INTO outbox (event: 'TRANSFER_COMPLETED', status: 'PENDING')
       ├───> COMMIT TRANSACTION
       │
       │ 5. Store HTTP response in Redis (Fast-Path Cache)
       ▼
[Return HTTP 200 OK] ➔ Customer receives transaction receipt instantly!

─── (Background Async Outbox Process) ───
[Outbox Worker]
       │ 6. SELECT * FROM outbox WHERE status = 'PENDING' FOR UPDATE SKIP LOCKED
       │ 7. Publish payload to Kafka topic 'transaction-events'
       │ 8. Mark outbox entry status = 'PROCESSED'
       ▼
[Kafka Subscribers] ➔ Analytics Service & Notification Engine consume event
```

---

## ⚡ 3. Core Architectural Design Patterns

### 1. 🧮 Double-Entry Bookkeeping Ledger
To guarantee zero monetary drift, money is never modified arbitrarily. Every financial movement generates offsetting ledger entries enforcing:
$$\sum \text{DEBIT} + \sum \text{CREDIT} = 0$$

- **System Accounts**:
  - `BANK_CASH`: Cash reserves
  - `BANK_REVENUE`: Interest & fee income
  - `SUSPENSE`: Temporary holding account during multi-step settlement

---

### 2. 🔑 Fast-Path Redis Idempotency Engine
Prevents double-charging when users spam the "Submit Transfer" button:
- Client attaches `Idempotency-Key: <unique-uuid>`.
- Express middleware calls Redis `SET key value NX PX 30000`.
- If key exists, the request returns the cached previous response immediately without touching PostgreSQL or the AI engine.

---

### 3. 📤 Transactional Outbox Pattern with Kafka KRaft
Solves the dual-write problem (writing to DB + publishing to Kafka in a single HTTP request):
- DB changes and the outbox event are saved inside the **same atomic SQL transaction**.
- A background worker polls outbox rows using `SELECT ... FOR UPDATE SKIP LOCKED` (concurrent-safe) and publishes to Apache Kafka KRaft mode.
- Guarantees **at-least-once event delivery**.

---

### 4. ⚡ Circuit Breaker & Fallback Protection (Opossum)
If the Python ML Risk Engine (`ai-service:5001`) experiences high latency (>500ms) or crashes:
- The `Opossum` circuit breaker trips to `OPEN`.
- Requests bypass the ML model and immediately invoke the **Deterministic Fallback Rule Engine** (approves low-value transfers, flags transfers >$10,000).
- Prevents database connection pool exhaustion during AI outages.

---

## 🛠️ 4. Infrastructure Component Stack

| Infrastructure Component | Tech & Version | Purpose in AuraBank |
| :--- | :--- | :--- |
| **Cloud Emulation** | LocalStack 3.0 | Mocks AWS S3, ECR, and Secrets Manager locally for zero-cost AWS development. |
| **Event Bus** | Apache Kafka (KRaft) | Zookeeper-less event broker handling transaction streaming (`port 9092`). |
| **Kafka Management** | Kafka UI | Visual dashboard (`port 8090`) to inspect topics and payload messages. |
| **Jenkins CI/CD** | Jenkins 2.541 | Local pipeline server running declarative `Jenkinsfile` with Trivy scanning (`port 8085`). |
| **Model Registry** | MLflow 2.11 | Logs XGBoost training runs and model artifacts backed by LocalStack S3 (`port 5002`). |
| **Metrics Engine** | Prometheus 2.49 | Scrapes metrics every 10s from `/metrics` across Node.js, Python, and cAdvisor (`port 9090`). |
| **Distributed Tracing** | OpenTelemetry + Jaeger | End-to-end tracing across HTTP & gRPC microservice boundaries (`port 16686`). |
| **Log Aggregation** | Loki | Centralized container log indexing with Promtail log shipping (`port 3100`). |
| **Visual Dashboarding** | Grafana 10.3 | Dashboards for System Health, Fraud Metrics, Kafka Lag, and SRE SLO Error Budgets (`port 3001`). |

---

## 🔐 5. Security Hardening & Secret Isolation

1. **Unprivileged Container Execution**: Production Dockerfiles run with `USER node` and `USER appuser` to block root container execution.
2. **Multi-Stage Container Builds**: Dockerfiles utilize two-stage builds to strip compilers (`gcc`, `make`, TypeScript compilers) from the final production images.
3. **Strict Secret Management**: No credentials committed to source control. `.env` is gitignored; `.env.example` provides the environment key contract.

---

## 🔁 6. CI/CD Pipeline & GitOps Automation

Automated GitHub Actions workflow ([.github/workflows/ci.yaml](.github/workflows/ci.yaml)) & Jenkins Pipeline ([Jenkinsfile](Jenkinsfile)):
1. **`proto-lint`**: Lints `.proto` schemas and generates TypeScript/Python stubs using `buf` (authenticated via `secrets.GITHUB_TOKEN`).
2. **`openapi-lint`**: Validates OpenAPI REST specs using Spectral CLI v6.11.1.
3. **`test`**: Runs parallel Vitest (Node.js) and PyTest (Python) unit test suites.
4. **`docker-build`**: Validates Docker builds for `backend`, `ai-service`, and `frontend` using Docker BuildKit cache (`mode=min` & CPU-only PyTorch wheel).
5. **`publish`**: Automatically builds and pushes container images tagged with `sha-<commit>` and `latest` to GitHub Container Registry (`ghcr.io`) on merge to `main`.
6. **`jenkins-pipeline`**: Runs parallel linting, test suites, multi-stage Docker builds, Trivy container security scans, and deployment triggers on local Jenkins (`http://localhost:8085`).

---

## 🎤 7. System Design & DevOps Interview Guide

> **Use this section during technical interviews to explain the architecture like a Senior Engineer!**

### ⏱️ The 30-Second Elevator Pitch
> *"AuraBank is a cloud-native, event-driven digital banking system built with Node.js, Python FastAPI, PostgreSQL, Redis, and Apache Kafka. It features strict double-entry ledger accounting, real-time XGBoost fraud scoring, a transactional outbox engine for reliable Kafka event publishing, and a full OpenTelemetry observability mesh monitored via Prometheus, Jaeger, and Grafana."*

---

### 💬 Top 5 Interview Questions & Answers

#### **Q1: How do you prevent double-spending or duplicate charges when a user submits a transfer?**
> **Answer**:  
> *"We use a two-tiered idempotency strategy. First, the client attaches a unique `Idempotency-Key` header. In Express middleware, we perform an atomic Redis `SETNX` lock with a 30-second TTL. If the key exists, we immediately return the cached response without re-executing logic. Second, at the database level, the `transactions` table enforces a `UNIQUE(idempotency_key)` constraint inside an atomic SQL transaction."*

---

#### **Q2: How do you guarantee money is never lost or created out of thin air?**
> **Answer**:  
> *"We enforce strict double-entry accounting. Balance updates and ledger entries are executed inside a single PostgreSQL transaction (`BEGIN ... COMMIT`). For every credit to an account, an equal debit is posted to another account, satisfying $\sum \text{DEBIT} + \sum \text{CREDIT} = 0$. If any operation fails, the entire transaction rolls back."*

---

#### **Q3: What happens if the Python AI Fraud service goes down or times out during a transfer?**
> **Answer**:  
> *"We implement the Circuit Breaker pattern using Opossum. If the AI service fails 5 consecutive times or takes longer than 500ms, the circuit trips to `OPEN`. All incoming requests automatically fallback to a deterministic rule engine (approving low-risk transfers under $10,000 and flagging higher amounts). This prevents cascading timeouts and keeps the payment gateway resilient."*

---

#### **Q4: How do you handle writing to the database and publishing events to Kafka without using expensive 2-Phase Commit (2PC) transactions?**
> **Answer**:  
> *"We implement the Transactional Outbox Pattern. When a transaction succeeds, we insert an event row into an `outbox` table within the same SQL transaction. A separate background worker thread periodically polls the outbox using `SELECT * FROM outbox WHERE status = 'PENDING' FOR UPDATE SKIP LOCKED`. It publishes events to Kafka and marks them as `PROCESSED`. This guarantees at-least-once event delivery without blocking the user response."*

---

#### **Q5: How do you trace a slow request across Node.js, Python, and PostgreSQL?**
> **Answer**:  
> *"We use OpenTelemetry distributed tracing. The Express backend injects a `traceparent` W3C header into downstream HTTP/gRPC requests to the Python AI service. Both services export trace spans to the OpenTelemetry Collector, which sends them to Jaeger. In Jaeger or Grafana, we can view the end-to-end waterfall timeline and identify exact latency bottlenecks down to individual SQL queries or ML model inference calls."*

---

<div align="center">

**AuraBank Production Engineering & Interview Guide** • Maintained by [@9046balaji](https://github.com/9046balaji)

</div>
