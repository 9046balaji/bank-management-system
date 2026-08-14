# 🏦 Aura Bank - Cloud-Native Microservices & AI Platform

<div align="center">

![Aura Bank Logo](https://img.shields.io/badge/AURA-BANK-135bec?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDE4Yy00LjQxIDAtOC0zLjU5LTgtOHMzLjU5LTggOC04IDggMy41OSA4IDgtMy41OSA4LTggOHptLjMxLTguODZhYy0xLjc3LS40NS0yLjM0LS45NC0yLjM0LTEuNjcgMC0uODQuNzktMS40MyAyLjEtMS40MyAxLjM4IDAgMS45LjY2IDEuOTQgMS42NGgxLjcxYy0uMDUtMS4zNC0uODctMi41Ny0yLjQ5LTIuOTdWNUgxMC45djEuNjljLTEuNTEuMzItMi43MiAxLjMtMi43MiAyLTVIND4xOSAxLjc5IDEuNDkgMi42OCAzLjY2IDMuMjEgMS45NS40NyAyLjM0IDEuMTUgMi4zNCAxLjg3IDAgLjUzLS4zOSAxLjM5LTIuMSAxLjM5LTEuNiBDMC0yLjIzLS43Mi0yLjMyLTEuNjRIOC4wNGMuMSAxLjcgMS4zNiAyLjY2IDIuODYgMi45N1YxOWgyLjM0di0xLjY3YzEuNTItLjI5IDIuNzItMS4xNiAyLjcyLTIuNzQgMC0yLjItMS45LTIuOTUtMy42NS0zLjQ1eiIvPjwvc3ZnPg==)

**Cloud-Native Microservices Platform on AWS EKS with Double-Entry Ledger, Event-Driven Transactional Outbox, Real-Time gRPC AI Risk Scoring, pgvector RAG, GitOps (ArgoCD), and OpenTelemetry Observability**

[![Go Microservices](https://img.shields.io/badge/Go-v1.22-00ADD8?style=flat-square&logo=go)](https://go.dev/)
[![Node.js TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Python FastAPI](https://img.shields.io/badge/Python-FastAPI_v0.109-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![AWS EKS](https://img.shields.io/badge/AWS-EKS_v1.30-FF9900?style=flat-square&logo=amazonaws)](https://aws.amazon.com/eks/)
[![Terraform](https://img.shields.io/badge/IaC-Terraform-7B42BC?style=flat-square&logo=terraform)](https://www.terraform.io/)
[![ArgoCD](https://img.shields.io/badge/GitOps-ArgoCD-EF7B4D?style=flat-square&logo=argo)](https://argoproj.github.io/cd/)
[![Kafka](https://img.shields.io/badge/Kafka-Strimzi-231F20?style=flat-square&logo=apachekafka)](https://kafka.apache.org/)
[![pgvector](https://img.shields.io/badge/Vector_DB-pgvector_384dim-336791?style=flat-square&logo=postgresql)](https://github.com/pgvector/pgvector)
[![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-Collector-000000?style=flat-square&logo=opentelemetry)](https://opentelemetry.io/)

[System Architecture](#-system-architecture) • [Microservices Catalog](#-microservices-catalog) • [Double-Entry Ledger](#-double-entry-accounting-ledger) • [Observability Stack](#-observability--monitoring-stack) • [Quick Start](#-quick-start--deployment)

</div>

---

## 📖 Executive Summary

**Aura Bank** is a cloud-native microservices fintech platform hosted on **AWS EKS**. The platform decomposed an original monolith into 9 domain-isolated microservices featuring:
- **Strict Double-Entry Bookkeeping**: Mathematical zero-sum accounting (`DEBIT + CREDIT = 0`) with PostgreSQL immutability DB triggers.
- **Transactional Outbox Pattern**: Concurrent-safe `FOR UPDATE SKIP LOCKED` outbox worker polling guarantees at-least-once Kafka event delivery.
- **Authoritative Idempotency Engine**: PostgreSQL `UNIQUE(idempotency_key)` constraints combined with Redis fast-path caching.
- **FastAPI & gRPC AI Risk Scoring**: Python AI Fraud Engine (`p95 < 10ms` target) with XGBoost inference and deterministic rule-based fallback.
- **GenAI Financial Advisor RAG**: PostgreSQL `pgvector` IVFFlat index with `sentence-transformers/all-MiniLM-L6-v2` 384-dimensional embeddings.
- **Full SRE & Observability Mesh**: OTel Agent + Gateway, Tail Sampling, Jaeger distributed tracing, Prometheus SLO recording rules, Alertmanager alerts, Grafana error budget dashboards, and LitmusChaos MTTR benchmarks.

---

## 🏗️ Target Microservices Architecture

```mermaid
```

---

## 📱 Application Views Catalog (`views/`)

The platform contains 18 comprehensive user & admin views:

| View File | Audience | Key Capabilities & Description |
| :--- | :--- | :--- |
| **`Landing.tsx`** | Public | Marketing landing page showcasing features, security certifications, and CTA buttons. |
| **`Auth.tsx`** | Public | 3D interactive authentication wizard (Register, Login, Password Reset, Role Toggle). |
| **`KYC.tsx`** | Customer | Customer identity verification, SSN/ID upload, 4-digit PIN setup, initial account allocation. |
| **`Dashboard.tsx`** | Customer | Main financial command center: account balance cards, recent activity, quick action drawer. |
| **`ManageFunds.tsx`** | Customer | Cash deposit, withdrawal, cardless ATM code generation, and beneficiary quick transfer. |
| **`Transfer.tsx`** | Customer | Inter-bank & P2P wire transfers, idempotency key verification, downloadable digital receipts. |
| **`Cards.tsx`** | Customer | Debit/credit card manager: physical card freeze/unfreeze, limit changes, PIN reset, rewards tracking. |
| **`Loans.tsx`** | Customer | Active loan tracker, EMI repayment schedule viewer, loan application wizard with AI scoring. |
| **`Analytics.tsx`** | Customer | Interactive financial charts, spending category breakdown, monthly cashflow projections. |
| **`Support.tsx`** | Customer | Customer support desk: ticket creation, comment threads, public FAQs, live chat trigger. |
| **`Profile.tsx`** | Customer | User profile editor, avatar update, security preferences, multi-channel notification toggles. |
| **`AdminOverview.tsx`** | Admin | Executive banking dashboard: system deposits, active user count, total transaction volume. |
| **`AdminCardApprovals.tsx`** | Admin | Card issuance review desk: approve/reject credit card applications and limits. |
| **`AdminLoanApprovals.tsx`** | Admin | Loan approval desk: review AI risk scores (0-100), DTI ratios, credit scores, approve/reject. |
| **`AdminPaymentTracking.tsx`** | Admin | Real-time transaction surveillance: monitor transfers, search by reference ID, inspect fraud flags. |
| **`AdminFeedback.tsx`** | Admin | Customer feedback manager: review 1-5 star ratings, respond to inquiries, toggle public testimonials. |
| **`AdminChat.tsx`** | Admin | Staff live chat console: real-time messaging workspace for supporting customer inquiries. |
| **`AdminSystemConfig.tsx`** | Admin | System parameters manager: toggle maintenance mode, set daily transfer limits, adjust interest rates. |

---

## 🏦 Double-Entry Accounting Ledger

Aura Bank enforces strict **double-entry bookkeeping** on every financial transaction:
$$\sum \text{DEBIT} + \sum \text{CREDIT} = 0$$

### System Ledger Accounts
- `00000000-0000-0000-0000-000000000001` -> **`BANK_CASH`** (Main Cash Reserve)
- `00000000-0000-0000-0000-000000000002` -> **`BANK_REVENUE`** (Interest & Fee Income)
- `00000000-0000-0000-0000-000000000003` -> **`BANK_FEES`** (Transaction Fees Collected)
- `00000000-0000-0000-0000-000000000004` -> **`SUSPENSE`** (Temporary Pending Holding)
- `00000000-0000-0000-0000-000000000005` -> **`BANK_LOANS`** (Outstanding Loan Principal)

---

## 🤖 AI & Machine Learning Microservice (`ai-service/`)

The Python Flask AI Service (`app.py`) exposes advanced ML & NLP capabilities:
1. **Real-Time Fraud Detection** (`/predict-fraud`): Calculates fraud probability scores (0-100) and recommendation flags (`APPROVE`, `FLAG`, `REJECT`).
2. **AI Loan Risk Evaluator** (`/predict-loan-risk`): Evaluates monthly income, credit score, DTI ratio, and computes safe loan eligibility.
3. **Expense Categorizer** (`/categorize-expense`): Scikit-learn TF-IDF + Logistic Regression model auto-labeling transactions into 9 spending categories with online feedback re-training (`/feedback/category-correction`).
4. **AI Banking Chat Assistant** (`/chat`): Natural language financial queries and spending analysis.

---

## 📊 Observability & SRE Stack

The project features a comprehensive **OpenTelemetry Collector + Jaeger + Prometheus + Grafana** telemetry mesh:

| Service | Access URL | Credentials / Notes |
| :--- | :--- | :--- |
| **Banking Web SPA** | [http://localhost:3000](http://localhost:3000) | Frontend React Application |
| **Backend REST API** | [http://localhost:5000](http://localhost:5000) | Express Node.js API |
| **AI ML Service** | [http://localhost:5001](http://localhost:5001) | Flask AI Microservice |
| **Jaeger Distributed Tracing** | [http://localhost:16686](http://localhost:16686) | OTel Trace Visualizer |
| **Grafana Dashboards** | [http://localhost:3001](http://localhost:3001) | User: `admin` / Password: `admin` |
| **Prometheus Metrics** | [http://localhost:9090](http://localhost:9090) | PromQL Metrics Browser |
| **OTel Collector Metrics** | [http://localhost:8889](http://localhost:8889) | OTel SpanMetrics Exporter |
| **Alertmanager** | [http://localhost:9093](http://localhost:9093) | Alert Status Management |
| **cAdvisor Metrics** | [http://localhost:8080](http://localhost:8080) | Container Resource Monitor |

---

## 🗺️ Microservices Migration Roadmap

For the full **DevOps + AI Microservices Engineering Blueprint**, refer to:
- **[monoloth_to_microservice.md](monoloth_to_microservice.md)**: Master plan detailing AWS EKS deployment, Terraform IaC, ArgoCD GitOps, Transactional Outbox pattern, and 5-phase incremental roadmap.
- **[devops_ai_resume_showcase_guide.md](devops_ai_resume_showcase_guide.md)**: Resume bullet points, system design interview Q&A scenarios, and portfolio setup.

---

## ⚡ Quick Start (Docker Compose)

```bash
# 1. Clone repository
git clone https://github.com/9046balaji/bank-management-system.git
cd "bank management system"

# 2. Launch full container stack
docker-compose up -d --build

# 3. Verify health
docker-compose ps
```

---

<div align="center">

Developed with ❤️ by **[@9046balaji](https://github.com/9046balaji)**

</div>
