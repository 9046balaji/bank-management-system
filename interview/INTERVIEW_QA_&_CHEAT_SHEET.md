# 🎤 DevOps Interview Q&A & Cheat Sheet Master File

> **AuraBank Platform — Complete 40+ Question Interview Preparation Reference**

---

## 📑 Table of Contents
1. [Personal Pitch Scripts (30s, 60s, 2-Min)](#1-personal-pitch-scripts)
2. [40 Detailed Interview Questions & Answers](#2-40-detailed-interview-questions--answers)
3. [Technology Cheat Sheet](#3-technology-cheat-sheet)
4. [Practical Command Cheat Sheet](#4-practical-command-cheat-sheet)
5. [What I Should NOT Claim in an Interview](#5-what-i-should-not-claim-in-an-interview)
6. [Final Quick Revision Table](#6-final-quick-revision-table)

---

## 1. Personal Pitch Scripts

### ⚡ 30-Second DevOps Introduction
> *"Hi, I'm a DevOps engineer focused on containerization, CI/CD automation, and observability. In my AuraBank project, I built multi-stage Docker images, set up event-driven compose infrastructure with Kafka and LocalStack, designed OpenTelemetry/Prometheus/Grafana monitoring, and automated image publishing with GitHub Actions."*

---

### ⏱️ 60-Second Project Answer ("Tell me about your project")
> *"AuraBank is a full-stack digital banking platform that I built and containerized using Docker and Docker Compose. It features a React frontend, a Node.js Express API backend, a Python Flask/FastAPI AI engine for real-time fraud detection and loan risk scoring, PostgreSQL for transactional storage, and Redis for idempotency locks.
> 
> As a DevOps engineer on this project, I containerized all services using multi-stage Dockerfiles, orchestrated local infrastructure like Apache Kafka, LocalStack, and MLflow using Docker Compose, configured an OpenTelemetry collector mesh sending metrics to Prometheus and traces to Jaeger, and built an automated GitHub Actions CI/CD pipeline that tests, lints, and pushes validated container images to GitHub Container Registry."*

---

### 🎤 2-Minute Project & DevOps Role Explanation
> *"AuraBank is a full-stack digital banking ecosystem designed with a microservices architecture. It features a React frontend, Node.js API backend, Python ML risk engine, PostgreSQL database, Redis cache, and Apache Kafka event broker.
> 
> As a DevOps engineer, I containerized the services using multi-stage Dockerfiles with non-root users to keep images small and secure. I configured Docker Compose for local service discovery and health checks. I implemented an OpenTelemetry observability stack with Prometheus, Grafana, Jaeger, and Loki for monitoring latency, container CPU/RAM, and error budgets.
> 
> I also built a GitHub Actions CI/CD pipeline that lints Protobuf and OpenAPI specs, runs unit tests, validates Docker builds, and publishes tagged images to GHCR. One major problem I solved was reducing our AI service Docker build time from 20 minutes down to 1.5 minutes by switching to a CPU-only PyTorch wheel and optimizing BuildKit cache modes."*

---

## 2. 40 Detailed Interview Questions & Answers

### 📌 Project Questions

#### 1. Tell me about your project.
- **Short Answer**: AuraBank is a multi-container digital banking system built with Node.js, Python, PostgreSQL, Redis, Kafka, and OpenTelemetry.
- **Detailed Explanation**: It allows users to transfer funds, manage cards, apply for loans, and interact with an AI support bot, while providing admins with a real-time surveillance dashboard.
- **Possible Follow-up**: *What was the most complex technical feature?* The atomic double-entry accounting ledger combined with Redis idempotency locking.

#### 2. What was your role as a DevOps Engineer?
- **Short Answer**: I handled containerization, local orchestration, CI/CD pipelines, observability mesh setup, and database reliability.
- **Detailed Explanation**: I created multi-stage Dockerfiles, configured Docker Compose with health checks, set up OpenTelemetry/Prometheus/Grafana monitoring, and built GitHub Actions workflows.

#### 3. Why did you choose a microservices architecture?
- **Short Answer**: To decouple domain concerns (Auth, Ledger, AI Risk Engine) so they can scale independently.
- **Detailed Explanation**: Isolating the Python ML Risk engine from the Node.js API Gateway prevents ML compute load from slowing down user login and account browsing.

#### 4. What was the biggest technical challenge?
- **Short Answer**: Optimizing CI/CD build performance and handling PostgreSQL database schema migrations without downtime.
- **Detailed Explanation**: Resolving the 20-minute Docker build bottleneck for PyTorch ML dependencies and implementing atomic database migrations for missing columns like `responded_by`.

#### 5. What did you personally implement?
- **Short Answer**: Multi-stage Dockerfiles, Docker Compose stack, GitHub Actions CI/CD pipeline, Prometheus alert rules, Grafana dashboards, and Redis idempotency locks.

---

### 🐳 Docker & Containerization

#### 6. Why Docker?
- **Short Answer**: Guarantees identical execution across local dev machines and CI/CD runners.
- **Detailed Explanation**: Eliminates dependency mismatches across Node, Python, Postgres, Redis, and Kafka.

#### 7. Explain your Dockerfile structure.
- **Short Answer**: Stage 1 installs tools and compiles code; Stage 2 copies built artifacts into a clean runtime image with a non-root user.

#### 8. Why use multi-stage builds?
- **Short Answer**: Drops build-time tools (`gcc`, `make`, TypeScript compilers) from the final production container.

#### 9. How do containers communicate?
- **Short Answer**: Over Docker Compose bridge networks using internal service names (e.g. `http://ai-service:5001`).

#### 10. How do you debug a failing container?
- **Short Answer**: Use `docker logs -f <name>`, `docker inspect <name>`, and `docker exec -it <name> sh`.

---

### 🐙 Docker Compose

#### 11. Why Docker Compose?
- **Short Answer**: Single-command startup (`docker compose up -d`) for multi-container development.

#### 12. How does service discovery work in Compose?
- **Short Answer**: Compose runs an internal DNS resolver mapping container service names to bridge IPs.

#### 13. How do you persist PostgreSQL data?
- **Short Answer**: Using named Docker volumes (`postgres_data:/var/lib/postgresql/data`).

#### 14. How do you handle environment variables in Compose?
- **Short Answer**: Using `${ENV_VAR}` references bound to a local gitignored `.env` file.

#### 15. How do you troubleshoot network connectivity between Compose services?
- **Short Answer**: Run `docker exec -it aurabank-backend nc -zv db 5432` to verify TCP socket connectivity.

---

### 🔁 CI/CD & GitHub Actions

#### 16. Explain your CI/CD pipeline.
- **Short Answer**: Runs Protobuf/OpenAPI lints, unit tests, Docker build validation, and pushes images to GHCR on main push.

#### 17. What happens after a developer pushes code?
- **Short Answer**: GitHub Actions triggers 4 parallel validation jobs, followed by Docker BuildKit compilation.

#### 18. How did you fix CI failures involving API rate limits?
- **Short Answer**: Added `github_token: ${{ secrets.GITHUB_TOKEN }}` to `bufbuild/buf-setup-action@v1`.

#### 19. Where are container images stored?
- **Short Answer**: GitHub Container Registry (`ghcr.io`).

#### 20. How are images tagged?
- **Short Answer**: Tagged with immutable git commit SHA (`sha-<commit>`) and `latest`.

---

### 📊 Monitoring & Observability

#### 21. Why Prometheus?
- **Short Answer**: Industry-standard time-series database for scraping metrics every 10 seconds.

#### 22. Why Grafana?
- **Short Answer**: Unified dashboarding tool to visualize Prometheus metrics, Jaeger traces, and Loki logs.

#### 23. What is the difference between Metrics, Logs, and Traces?
- **Short Answer**: Metrics tell you *THAT* something is wrong; Logs tell you *WHAT* happened; Traces tell you *WHERE* latency occurred.

#### 24. What is OpenTelemetry?
- **Short Answer**: Vendor-agnostic framework for collecting metrics, traces, and logs.

#### 25. How would you investigate high API latency?
- **Short Answer**: Search Jaeger traces for long waterfall spans across Express, Python AI, and PostgreSQL.

---

### 🔴 Real Troubleshooting & RCA

#### 26. How did you debug an HTTP 500 error in the Admin Panel?
- **Short Answer**: Inspected backend logs (`[DB] Query failed`), identified missing column `responded_by`, and added `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

#### 27. Why was the AI service Docker build taking 20 minutes?
- **Short Answer**: Default pip pulled an 850MB CUDA PyTorch wheel, and BuildKit `mode=max` spent 10 minutes exporting layers.

#### 28. How did you fix the 20-minute Docker build?
- **Short Answer**: Added `--extra-index-url https://download.pytorch.org/whl/cpu` (140MB wheel) and changed BuildKit cache to `mode=min`.

#### 29. How did you fix a white screen React Context crash?
- **Short Answer**: Replaced duplicate context paths with single canonical import `import { useSystemConfig } from '../src/contexts';`.

#### 30. How do you inspect live logs in production?
- **Short Answer**: Use `docker logs -f <container>` or query Loki log store in Grafana.

---

### 🚀 Production & Scaling

#### 31. How would you deploy this to AWS?
- **Short Answer**: EKS for Kubernetes compute, RDS PostgreSQL for DB, ElastiCache Redis, MSK Kafka, and ECR for image storage.

#### 32. How would you scale the Node.js backend?
- **Short Answer**: Increase replica count in Compose or Kubernetes deployment behind a load balancer.

#### 33. What happens if Redis goes down?
- **Short Answer**: Idempotency checks fall back to PostgreSQL `UNIQUE(idempotency_key)` constraints.

#### 34. What happens if PostgreSQL goes down?
- **Short Answer**: API returns HTTP 503; Alertmanager fires `ContainerServiceDown` alert; data recovered from `pg-backup` daily dump.

#### 35. How would you handle secrets in production?
- **Short Answer**: Store secrets in AWS Secrets Manager or HashiCorp Vault instead of `.env` files.

---

### ⚡ Advanced System Design

#### 36. What is idempotency?
- **Short Answer**: Ensuring repeated identical API requests produce the same result without double-processing.

#### 37. Why use Apache Kafka?
- **Short Answer**: High-throughput event streaming broker to decouple payment completion from notification and analytics processing.

#### 38. What is the Transactional Outbox pattern?
- **Short Answer**: Saving DB changes and outbox event rows inside a single atomic SQL transaction before async Kafka publishing.

#### 39. What is a double-entry ledger?
- **Short Answer**: Accounting rule enforcing $\sum \text{DEBIT} + \sum \text{CREDIT} = 0$ for every financial entry.

#### 40. How would you improve this architecture for production?
- **Short Answer**: Add TLS/HTTPS termination via ALB, deploy to AWS EKS with Terraform IaC, and set up ArgoCD GitOps continuous deployment.

---

## 3. Technology Cheat Sheet

| Technology | Why We Used It | What I Did With It | Interview Point |
| :--- | :--- | :--- | :--- |
| **Docker** | Containerization | Multi-stage builds & non-root users | Image size under 200MB |
| **Docker Compose** | Orchestration | Service discovery, networks, volumes | Single-command startup (`up -d`) |
| **PostgreSQL 15** | Database | Double-entry ledger & outbox schema | Atomic transactions |
| **Redis 7** | Fast Cache | Idempotency locking (`SETNX`) | Prevents double charging |
| **Kafka (KRaft)** | Streaming Bus | Asynchronous transaction events | Transactional Outbox pattern |
| **Prometheus** | Metrics TSDB | Scrapes `/metrics` & `alerts.yml` rules | SRE alert monitoring |
| **Grafana** | Visualization | System, Fraud, & SLO Dashboards | Unified observability |
| **Jaeger** | Tracing | End-to-end trace waterfall visualizer | Latency bottleneck analysis |
| **GitHub Actions** | CI/CD | Protobuf/OpenAPI lints & GHCR push | BuildKit cache optimization |

---

## 4. Practical Command Cheat Sheet

```bash
# Docker Compose
docker compose up -d                        # Start all containers in background
docker compose up -d --build                # Rebuild and start containers
docker compose down                         # Stop and remove containers & networks
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"  # Status table
docker logs -f aurabank-backend             # Stream backend logs
docker exec -it aurabank-db psql -U postgres -d aurabank  # Shell into Postgres

# Git
git status --short                          # View pending file changes
git add -A ; git commit -m "feat: description" # Commit changes
git push origin main                        # Push to GitHub main branch
```

---

## 5. What I Should NOT Claim in an Interview

❌ **Do NOT claim**:
- That you deployed this live to AWS EKS (it is running locally on Compose; AWS is a future production plan).
- That you built production Kubernetes HA clusters.
- That secrets are 100% production-vaulted (explain local uses `.env`, prod will use AWS Secrets Manager).
- That you personally wrote all application feature code (distinguish DevOps/infra work from application code).

---

## 6. Final Quick Revision Table

| If Interviewer Asks | I Should Answer |
| :--- | :--- |
| **Tell me about your project** | Multi-container fintech platform built with Node, Python AI, Postgres, Redis, Kafka, and OTel monitoring. |
| **Why Docker?** | Eliminates environment differences between local dev and CI/CD runners. |
| **How do you prevent double charging?** | Redis `SETNX` lock on `Idempotency-Key` + DB unique constraint. |
| **What is double-entry ledger?** | Financial accounting rule enforcing $\sum \text{DEBIT} + \sum \text{CREDIT} = 0$. |
| **How do you handle AI service timeouts?** | Opossum circuit breaker falls back to deterministic rule engine. |
| **Explain your CI/CD pipeline** | GitHub Actions runs Buf lint, Spectral lint, unit tests, Docker build, and pushes images to GHCR. |
| **How did you fix slow Docker builds?** | CPU-only PyTorch wheel (140MB vs 850MB) + `mode=min` BuildKit caching. |
| **How do you monitor container health?** | Prometheus scrapes metrics every 10s; Grafana displays dashboards; Alertmanager triggers alerts on downtime. |
