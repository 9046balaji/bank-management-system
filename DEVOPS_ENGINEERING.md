# 🏗️ AuraBank — Production Infrastructure & DevOps/SRE Blueprint

<div align="center">

![DevOps Banner](https://img.shields.io/badge/DEVOPS-SRE_ARCHITECTURE-FF9900?style=for-the-badge&logo=kubernetes)

**Enterprise-Grade Microservices Architecture, Event-Driven Streaming with Apache Kafka (KRaft), LocalStack AWS Emulation, OpenTelemetry Observability Mesh, GitOps (ArgoCD), and Infrastructure as Code (Terraform)**

</div>

---

## 📐 1. Architectural Architecture & Topology

AuraBank uses a decoupled, event-driven microservices topology designed for zero-downtime deployment, sub-10ms risk evaluation, and immutable financial ledger processing.

```
                  ┌─────────────────────────────────────────┐
                  │          Client / Web Browser           │
                  └────────────────────┬────────────────────┘
                                       │ HTTP / REST
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │       Frontend SPA (Nginx / React)      │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │     Backend API Gateway (Express / Node)│
                  └──────┬──────────────────┬───────────────┘
                         │                  │
           gRPC / OTLP   │                  │ SQL / Redis
                         ▼                  ▼
          ┌───────────────────┐    ┌───────────────────┐
          │  Python AI Risk   │    │  PostgreSQL 15    │
          │  Engine (FastAPI) │    │  & Redis 7 Cache  │
          └─────────┬─────────┘    └───────────────────┘
                    │
                    ▼
          ┌─────────────────────────────────────────────┐
          │ OpenTelemetry Collector ➔ Jaeger & Grafana  │
          └─────────────────────────────────────────────┘
```

---

## ⚡ 2. Infrastructure Component Stack

| Infrastructure Layer | Component | Implementation & Configuration Details |
| :--- | :--- | :--- |
| **Container Engine** | Docker Compose | Multi-container stack (`docker-compose.yml` & `docker-compose.local.yaml`) with explicit memory/CPU limits and resource quotas. |
| **Cloud Emulation** | LocalStack 3.0 | Mocks AWS S3, ECR, and Secrets Manager for local AWS development with zero cloud cost. |
| **Event Streaming** | Apache Kafka (KRaft) | Single-node/multi-broker Zookeeper-less KRaft event bus for asynchronous event processing. |
| **Model Registry** | MLflow | Experiment tracking and ML artifact storage backed by LocalStack S3. |
| **Metrics Collector** | Prometheus | Scrapes metrics every 10s across all containers (`/metrics`), alerting via Alertmanager. |
| **Log Aggregation** | Loki | Centralized container log indexing with 30-day retention policies. |
| **Distributed Traces** | Jaeger + OTel | End-to-end distributed tracing using OpenTelemetry gRPC exporters (`otel-collector:4317`). |
| **Dashboarding** | Grafana 10.3 | Pre-configured provisioning providers for system, Kafka lag, payment, and SLO error budget dashboards. |

---

## 🔐 3. Security Hardening & Secret Management

1. **Non-Root Container Execution**: All production Dockerfiles enforce non-root unprivileged execution (`USER node` / `USER appuser`).
2. **Multi-Stage Container Builds**: Dockerfiles utilize two-stage builds to exclude compiler tools (`gcc`, `build-essential`, `devDependencies`) from the final runtime image.
3. **Zero Hardcoded Secrets**: Secrets are loaded exclusively via environment variables referenced from `.env` (gitignored). `.env.example` serves as the public schema template.
4. **Network Isolation**: Docker Compose networks use driver bridges (`aurabank-network` / `aurabank-local`) to isolate internal database ports from external access.

---

## 🔁 4. CI/CD Pipeline Architecture (GitHub Actions)

The repository uses an automated GitHub Actions pipeline ([.github/workflows/ci.yaml](.github/workflows/ci.yaml)):

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Protobuf Lint  │     │ OpenAPI Lint    │     │ Matrix Tests    │
│  & Generation   │     │ (Spectral 6.x)  │     │ (Node + Python) │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                     ┌───────────────────────┐
                     │ Docker Build Check    │
                     │ (BuildKit Cache)      │
                     └───────────┬───────────┘
                                 │ (on main push)
                                 ▼
                     ┌───────────────────────┐
                     │ Publish to GHCR       │
                     │ (ghcr.io image tags)  │
                     └───────────────────────┘
```

### Key Workflow Highlights:
- **`proto-lint`**: Validates `.proto` definitions and generates TypeScript/Python stubs using `buf`. Authenticated via `github_token` to prevent API rate limits.
- **`docker-build`**: Validates all Dockerfiles (`backend`, `ai-service`, `frontend`) in parallel before any code merge.
- **`publish`**: Automatically tags images with `sha-<commit>` and `latest` on merge to `main`, pushing to GitHub Container Registry.

---

## 📊 5. Observability & SRE Metrics

### Prometheus SLI/SLO Metrics Exposed:
- `aurabank_backend_http_request_duration_seconds`: Histogram of HTTP latency across methods and status codes.
- `container_cpu_usage_seconds_total`: cAdvisor container CPU utilization.
- `container_memory_working_set_bytes`: cAdvisor working set memory.
- `kafka_consumergroup_lag`: Consumer group lag per topic.

### Pre-Configured Grafana Dashboards (`monitoring/grafana/dashboards/`):
- **System Overview**: Container CPU, RAM, Network I/O, and restart counters.
- **Fraud Engine Overview**: ML risk score distribution, p95 latency, model fallbacks.
- **Kafka Lag**: Real-time topic consumer lag.
- **SLO Error Budget**: Error budget burn rate calculation for 99.9% uptime target.

---

## 💾 6. Database Backups & High Availability

- **Automated Backup Sidecar**: `docker-compose.local.yaml` includes a dedicated `pg-backup` container running automated `pg_dump` every 24 hours.
- **Backup Retention**: Retains the last 7 daily backup dumps in named volume `pg_backups`, auto-purging older snapshots.

---

## 🚀 7. Infrastructure Commands Cheat Sheet

```bash
# Start local development stack (LocalStack, Kafka, MLflow, Monitoring)
docker compose -f docker-compose.local.yaml up -d --build

# Inspect running container resource usage
docker stats

# Stream logs for a specific service
docker compose logs -f backend

# Verify database backup volume
docker exec -it aurabank-pg-backup ls -la /backups

# Gracefully bring down all containers and clean up networks
docker compose -f docker-compose.local.yaml down
```

---

<div align="center">

*AuraBank Infrastructure & SRE Engineering Team*

</div>
