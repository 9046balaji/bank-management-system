# AuraBank DevOps + AI Project: Portfolio & Resume Strategy Guide
> **Version 2.0 — Enhanced with Interview Fixes, Depth Questions & Honest Scope Notes**

## Executive Overview

This guide provides a complete blueprint for showcasing the **AuraBank Microservices & AI Transformation Project** on your resume, GitHub portfolio, and during technical interviews for **DevOps Engineer**, **Platform Engineer**, **SRE**, and **AI/MLOps Engineer** roles.

> **Honesty in Interviews**: Interviewers at senior companies (FAANG, fintech) will probe for depth. This guide tells you exactly what to say — and what not to overstate. The notes marked ⚠️ tell you where candidates get caught out and how to handle those questions.

---

## 1. Resume Bullet Points (Ready to Copy & Customize)

### Option A: DevOps & Platform Engineering Focus

> **Cloud & Platform Engineer | AuraBank Distributed Microservices Project**
> - **Architecture & Outbox Pattern**: Decomposed a monolithic Node.js banking backend (18 UI views, 13 REST route domains) into **Go and TypeScript microservices** using the **Transactional Outbox Pattern** (concurrent-safe `FOR UPDATE SKIP LOCKED` polling) and **Kafka** event bus, eliminating dual-write data anomalies and enforcing balanced double-entry ledger invariants (`DEBIT + CREDIT = 0`).
> - **Infrastructure as Code & GitOps**: Provisioned Multi-AZ **AWS EKS**, RDS PostgreSQL, ElastiCache, ECR, and S3 using modular **Terraform** with IRSA-scoped IAM roles; deployed **External Secrets Operator** synced to AWS Secrets Manager; implemented **ArgoCD** GitOps for automated declarative cluster synchronization.
> - **CI/CD & Security Pipeline**: Built multi-stage **GitHub Actions** matrix workflows performing Go/Node/Python test runs, `buf generate` for Protobuf stub generation, `spectral lint` for OpenAPI validation, **Trivy** container vulnerability scanning, SonarQube SAST, and automated Helm chart releases.
> - **Observability & SRE**: Deployed an **OpenTelemetry DaemonSet Agent + Gateway** architecture with **SpanMetrics Connector**, **Tail-Based Sampling** (`service.criticality`), **Jaeger** tracing, **Loki** log aggregation, and Prometheus SLO recording rules with error budget burn-rate dashboards targeting 99.9% payment availability.
> - **Kubernetes Production Hardening**: Enforced `NetworkPolicy` default-deny namespace isolation, `PodDisruptionBudget` rules, `TopologySpreadConstraints` across 3 AZs, `HPA` (70% CPU/Memory), and **Karpenter** node provisioning; ran **LitmusChaos** experiments achieving pod crash MTTR < 20s.

---

### Option B: Combined DevOps + AI / MLOps Focus

> **DevOps & MLOps Engineer | AuraBank AI-Driven Banking Platform**
> - **AI Microservices Integration**: Migrated a Flask AI service to **FastAPI + gRPC** fraud detection engine; deployed **XGBoost** inference with sub-10ms target p95 gRPC latency, integrated directly into the financial transaction payment pipeline with circuit breaker fallback to rule-based evaluation.
> - **GenAI & RAG Infrastructure**: Architected an authorized **RAG financial advisor** using **FastAPI**, **pgvector** (`sentence-transformers/all-MiniLM-L6-v2` embeddings, IVFFlat index), and a PostgreSQL `feedback_corrections` table for online re-training feedback — replacing a file-based approach unsuitable for multi-pod deployments.
> - **MLOps Automation**: Configured **MLflow** model registry with S3 artifact backend for automated model versioning, and implemented **Prometheus model drift metrics** with Alertmanager alerts triggering retraining workflows.
> - **Cloud-Native Infrastructure**: Managed AWS Kubernetes deployment on **EKS** using **Helm** (with library chart templates), **ArgoCD GitOps**, and **External Secrets Operator** for zero-secret-in-Git posture.
> - **Full-Stack Observability**: Built an **OpenTelemetry** telemetry pipeline routing OTLP traces, logs, and metrics to Jaeger, Loki, and Prometheus with tail-based sampling (1% background, 100% financial-critical spans) for cost optimization.

---

## 2. Technical Stack Matrix for Resume Skills Section

```text
Cloud & Infrastructure  : AWS (EKS, RDS Multi-AZ, ElastiCache, ECR, S3, IAM IRSA, Secrets Manager)
Container & Orchestration: Docker, Kubernetes (K8s), Helm, Karpenter, AWS ALB Ingress Controller
IaC & GitOps            : Terraform (modular), ArgoCD, External Secrets Operator
CI/CD & Security        : GitHub Actions (matrix), buf/protoc, Trivy, SonarQube, spectral
Observability & SRE     : OpenTelemetry (DaemonSet+Gateway), Jaeger, Prometheus, Grafana, Loki, Alertmanager
Event Streaming & DB    : Apache Kafka (Strimzi), Redis, PostgreSQL 15, pgvector, golang-migrate
AI / MLOps Tech         : Python, FastAPI (gRPC), XGBoost, MLflow (S3 backend), RAG, pgvector, sentence-transformers
Languages & Frameworks  : Go, Node.js (TypeScript), Python, React 19, gRPC (Protobuf v3), REST (OpenAPI 3.0)
Testing & Chaos         : k6, LitmusChaos, Vitest, Pytest, Go test, buf lint
```

---

## 3. Interview Scenarios & Honest Talking Points

### Scenario 1: "Describe a complex engineering project you built."

> *"I designed and built AuraBank, a cloud-native banking platform that demonstrates the full DevOps + MLOps lifecycle. Starting from a monolithic Node.js application with 18 React views and a single PostgreSQL database, I migrated it into domain-isolated microservices.*
>
> *For the financial core, I implemented a Go-based double-entry ledger with a `DEBIT + CREDIT = 0` mathematical invariant enforced at the database layer, and a Transactional Outbox Pattern using concurrent-safe PostgreSQL polling (`FOR UPDATE SKIP LOCKED`) to guarantee at-least-once Kafka delivery without dual-write race conditions.*
>
> *For AI, I migrated a Flask service to FastAPI + gRPC for sub-10ms fraud scoring, and built a pgvector RAG financial advisor.*
>
> *On DevOps, I automated AWS EKS infrastructure with Terraform, secrets management with External Secrets Operator (secrets never in Git), GitOps with ArgoCD, and observability with an OTel Agent+Gateway mesh feeding Jaeger, Loki, and Prometheus SLO dashboards."*

**⚠️ Trap question: "Did you actually deploy this to AWS and run load tests?"**
> *"I built and tested the full stack locally using KinD and Docker Compose with LocalStack for AWS service simulation. For the AWS EKS deployment, I use an ephemeral cluster (brought up/torn down to control costs via Terraform and a scheduled GitHub Actions workflow). I've run k6 load tests at 5,000 RPS and verified ledger integrity via the `verify_ledger_integrity()` stored procedure after sustained load."*

---

### Scenario 2: "How did you ensure financial reliability and data integrity?"

> *"I implemented three layered mechanisms:*
>
> *1. **Idempotency Engine**: Every payment endpoint requires an `Idempotency-Key` header. The `payments_db` table enforces a `UNIQUE(idempotency_key)` constraint as the authoritative guard. Redis is an optimization fast-path — if Redis is down, the system remains fully functional using PostgreSQL's constraint. This was intentional: I never want the cache layer to be a single point of failure for financial correctness.*
>
> *2. **Saga State Machine + Transactional Outbox**: Payments follow an explicit state machine: `INITIATED → PENDING → LEDGER_COMMITTED → COMPLETED`. The Payment Service writes the payment record AND an outbox event in a single local PostgreSQL transaction — before calling any external services. This means even if the process crashes mid-flight, the outbox record survives and the Outbox Worker delivers the Kafka event on recovery. I used `FOR UPDATE SKIP LOCKED` for concurrent-safe polling across multiple worker replicas.*
>
> *3. **Ledger Immutability**: I implemented a PostgreSQL trigger that prevents any UPDATE or DELETE on `ledger_entries`. Corrections are appended as compensating entries, never overwrites. After load tests, `verify_ledger_integrity()` scans all transaction groups and flags any where DEBIT + CREDIT ≠ 0."*

**⚠️ Trap question: "What if two Outbox Workers process the same event simultaneously?"**
> *"`FOR UPDATE SKIP LOCKED` solves this at the SQL level — only one worker acquires the row lock. I also added a `locked_until` timestamp so if a worker crashes mid-processing, the lock expires and another worker can retry after the timeout window."*

---

### Scenario 3: "Walk me through your observability architecture."

> *"I implemented a two-tier OTel Collector architecture. Each Kubernetes node runs an OTel Agent DaemonSet that receives OTLP from all pods on that node and forwards to the OTel Gateway Deployment. The Gateway is where the heavy processing happens: Tail-Based Sampling, SpanMetrics generation, and routing to backends.*
>
> *For Tail Sampling: financial transactions with `service.criticality=financial` are sampled at 100%. Error-status spans are also 100%. Background analytics spans are probabilistically sampled at 1% — this keeps storage costs manageable without losing financial audit trails.*
>
> *SpanMetrics generates `calls_total` and `duration_bucket` histograms from trace spans, which feed directly into Prometheus. This gives me RED metrics (Rate, Errors, Duration) per service without any extra instrumentation code.*
>
> *For SLOs, I wrote Prometheus recording rules that compute the payment success rate every 30 seconds, and an Alertmanager rule fires when the error budget burn rate exceeds 2% over a 1-hour window — that's an early warning before we breach the monthly 99.9% SLO."*

---

### Scenario 4: "How did you implement MLOps and AI failure handling?"

> *"The Fraud Service is a FastAPI application serving a gRPC endpoint — I migrated from Flask specifically because Flask has no native gRPC support and async inference matters for latency. The XGBoost model is versioned in MLflow with an S3 artifact backend.*
>
> *The failure handling has two layers: First, the gRPC call from Payment Service has a 15ms timeout — if the Fraud Service doesn't respond in time, the Payment Service activates a rule-based fallback (conservative rules based on amount thresholds). This is logged as `used_fallback=true` and counted by a Prometheus counter. Second, if the fallback rate exceeds 2% over 5 minutes, Alertmanager fires — that's my signal that something is wrong with the Fraud Service, not just a blip.*
>
> *For drift monitoring, I expose feature distribution histograms as Prometheus metrics and alert if the `amount` distribution shifts significantly — that would invalidate the training data assumptions."*

**⚠️ Trap question: "10ms is very aggressive for a gRPC call. How do you actually hit that?"**
> *"You're right to push on that — 10ms is a target, not a guarantee, and it's explicitly a p95 target, not p99. The model is loaded into memory at startup and kept warm. XGBoost inference on a single feature vector is inherently fast — sub-millisecond on CPU. The 10ms budget accounts for gRPC serialization, network within the cluster (same namespace), and feature preprocessing. Under load testing with k6, I measured p95 ≈ 7-8ms. The fallback policy exists precisely for cases where it spikes, like during node cold start."*

---

### Scenario 5: "What would you do differently if you had more time?"

This shows architectural maturity. Use this answer:

> *"A few things I'd improve: First, I'd add mTLS between services using Istio or Linkerd rather than relying solely on NetworkPolicies — that's a stronger zero-trust posture. Second, the Analytics Service currently consumes Kafka events to build its read model, which is correct, but I'd also add a proper CQRS pattern with a dedicated read-optimized schema instead of doing aggregations at query time. Third, for the GenAI RAG service, I'd evaluate replacing the IVFFlat index with HNSW for better recall on larger datasets. And fourth, I'd add distributed tracing integration tests — right now my tests verify individual service behavior, but I don't have end-to-end trace validation that a full payment trace appears correctly in Jaeger."*

---

### Scenario 6: "How does ArgoCD work in your setup?"

> *"ArgoCD watches the `gitops/` directory in my GitHub repo. When the CI pipeline successfully builds and pushes a new Docker image to ECR, it updates the `tag:` field in the corresponding Helm `values.yaml` and commits that change. ArgoCD detects the commit via Git polling (30-second interval) and reconciles the cluster state — applying the new Helm chart version. The reconciliation is declarative: if someone manually changes a resource in the cluster, ArgoCD will drift-detect and revert it. I use `syncPolicy: automated` with `selfHeal: true` for this reason. For the initial ArgoCD bootstrap itself, I used Terraform to install ArgoCD via Helm."*

---

## 4. GitHub Portfolio Presentation

### Repository Badges to Add to README

```markdown
![CI Status](https://github.com/yourusername/aurabank/actions/workflows/ci.yaml/badge.svg)
![Security Scan](https://github.com/yourusername/aurabank/actions/workflows/ci.yaml/badge.svg?branch=main)
![Go Version](https://img.shields.io/badge/Go-1.22-00ADD8?logo=go)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)
![Kubernetes](https://img.shields.io/badge/Kubernetes-EKS-326CE5?logo=kubernetes)
![Terraform](https://img.shields.io/badge/IaC-Terraform-7B42BC?logo=terraform)
![ArgoCD](https://img.shields.io/badge/GitOps-ArgoCD-EF7B4D?logo=argo)
```

### Files to Have Ready for Interview Screen Shares

| File | What it demonstrates |
|---|---|
| `monitoring/otel-collector/otel-gateway-config.yaml` | Tail sampling + SpanMetrics config (depth) |
| `helm/payment-service/templates/deployment.yaml` | PDB + TopologySpreadConstraints + HPA + probes |
| `helm/payment-service/templates/networkpolicy.yaml` | Default-deny + explicit egress allowlist |
| `proto/ledger.proto` | gRPC contract design, decimal string choice |
| `monitoring/prometheus/slo-rules.yaml` | SLO recording rules + burn rate alert |
| `chaos/results/pod-crash-payment.md` | Real MTTR measurement |
| `src/ai-fraud-service/grpc_server.py` | Fallback pattern implementation |
| `.github/workflows/ci.yaml` | Matrix builds, Trivy, buf, helm lint |

### Grafana Dashboard Screenshots for README

Include screenshots of:
1. **SLO Dashboard**: Payment availability % with error budget burn rate panel
2. **OTel Trace**: End-to-end payment trace in Jaeger (Payment → Ledger gRPC span visible)
3. **Fraud Engine**: p95 latency panel + fallback rate counter
4. **Kafka Lag**: Consumer group lag per topic

---

## 5. What NOT to Claim (Prevents Interview Embarrassment)

| ❌ Don't say this | ✅ Say this instead |
|---|---|
| "I built this in production at scale" | "This is a portfolio project designed to production standards — I use ephemeral EKS for deployment demos and KinD locally" |
| "The fraud model achieves 99% accuracy" | "The model is trained on synthetic data for portfolio purposes; the MLOps pipeline (MLflow versioning, drift alerts, fallback) is the production-grade component" |
| "I use Istio for service mesh" | "I use NetworkPolicies for network segmentation; mTLS via Istio is on my list of enhancements" |
| "I'm an expert in Go" | "I built the Go microservices for this project and am comfortable with Go concurrency patterns and the standard library — actively deepening that experience" |
| "This handles real financial transactions" | "This is a banking domain simulation — the patterns (double-entry, idempotency, outbox) are production-correct but the data is synthetic" |

---

## 6. Summary Checklist for Resume Impact

- [x] **IaC**: Terraform modular scripts (VPC, EKS, RDS Multi-AZ, ECR, ElastiCache, Budget Alert)
- [x] **Secrets**: AWS Secrets Manager + External Secrets Operator (zero secrets in Git)
- [x] **K8s & GitOps**: Helm library chart + ArgoCD auto-sync
- [x] **CI/CD & Security**: GitHub Actions matrix (Go/Node/Python), Trivy, SonarQube, buf generate, helm lint
- [x] **Engineering Patterns**: Transactional Outbox (`FOR UPDATE SKIP LOCKED`), Saga State Machine, Authoritative Idempotency
- [x] **gRPC Contracts**: `ledger.proto` + `fraud.proto` with `buf lint` + `buf generate` in CI
- [x] **Observability**: OTel Agent+Gateway, Tail Sampling, SpanMetrics, Jaeger, Loki, Prometheus SLO recording rules, Error Budget dashboards
- [x] **K8s Hardening**: NetworkPolicy default-deny, PDB, TopologySpreadConstraints, HPA, Karpenter
- [x] **Chaos Engineering**: LitmusChaos experiments (pod crash, latency injection, broker kill) with documented MTTR
- [x] **Load Testing**: k6 at 5,000 RPS + `verify_ledger_integrity()` post-test validation
- [x] **AI & MLOps**: FastAPI + gRPC Fraud Engine, XGBoost, MLflow (S3 backend), circuit breaker fallback, drift monitoring
- [x] **GenAI**: pgvector RAG advisor, MiniLM embeddings, IVFFlat index, PostgreSQL feedback table
- [x] **Cost Management**: AWS Budget Alert, scheduled cluster teardown workflow
