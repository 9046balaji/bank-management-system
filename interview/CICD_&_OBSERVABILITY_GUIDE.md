# 🔁 CI/CD & Observability Infrastructure Guide

> **AuraBank Platform — Interview CI/CD & Telemetry Reference**

---

## 🔁 1. GitHub Actions CI/CD Pipeline Architecture

```mermaid
flowchart TD
    Push(["Git Push / PR to main"]) --> Checkout["actions/checkout@v4"]

    subgraph ParallelJobs["⚡ Parallel Validation Jobs"]
        Checkout --> ProtoLint["bufbuild/buf-setup-action@v1<br/>Protobuf Lint & Generate"]
        Checkout --> SpectralLint["spectral-cli v6.11.1<br/>OpenAPI Spec Lint"]
        Checkout --> UnitTests["Vitest & PyTest Matrix<br/>(Node 20 & Python 3.11)"]
        Checkout --> HelmLint["azure/setup-helm@v4<br/>Helm Chart Lint"]
    end

    ProtoLint --> Gate{"All Tests Passed?"}
    SpectralLint --> Gate
    UnitTests --> Gate
    HelmLint --> Gate

    Gate -- Yes --> DockerBuild["docker/build-push-action@v5<br/>Docker Build Validation (BuildKit)"]
    Gate -- No --> Stop(["❌ Workflow Failed"])

    DockerBuild --> BranchCheck{"Is Branch main?"}
    BranchCheck -- Yes --> GHCR["Publish Docker Images to GHCR<br/>ghcr.io/owner/repo-service:sha-commit"]
    BranchCheck -- No --> PRDone(["✅ PR Succeeded"])

    GHCR --> DeployTrigger["Trigger Automated Deployment"]
```

---

## ⚙️ 2. Jenkins Declarative Pipeline Architecture (`Jenkinsfile`)

```mermaid
flowchart TD
    JStart(["Jenkins Trigger (Git SCM / Webhook)"]) --> JCheckout["Checkout Repository Source Code"]

    subgraph JParallelLint["⚡ Parallel Linting Stage"]
        JCheckout --> JProto["buf lint proto/"]
        JCheckout --> JSpectral["spectral lint openapi/*.yaml"]
        JCheckout --> JHelm["helm lint helm/*/"]
    end

    subgraph JParallelTest["🧪 Parallel Test Stage"]
        JCheckout --> JNodeTest["npm test (backend)"]
        JCheckout --> JPyTest["pytest tests/ --cov (ai-service)"]
    end

    JProto --> JGate{"All Lints & Unit Tests Passed?"}
    JSpectral --> JGate
    JHelm --> JGate
    JNodeTest --> JGate
    JPyTest --> JGate

    JGate -- No --> JFail(["❌ Jenkins Build Failed"])
    JGate -- Yes --> JDockerBuild["Parallel Docker Multi-Stage Build"]

    JDockerBuild --> JTrivyScan["Trivy Security Vulnerability Scan"]
    JTrivyScan --> JBranchCheck{"Is Branch main?"}

    JBranchCheck -- No --> JPRDone(["✅ Jenkins PR Build Succeeded"])
    JBranchCheck -- Yes --> JPushGHCR["Log in & Push Images to GHCR ghcr.io"]
    JPushGHCR --> JDeploy["Trigger Local Compose Deployment"]
    JDeploy --> JPrune["docker image prune (Workspace Cleanup)"]
```

---

## 📊 2. OpenTelemetry & Observability Mesh Architecture

```mermaid
graph LR
    subgraph AppWorkloads["Microservices"]
        ExpressBE["Express Backend API"]
        PyAI["Python AI Risk Engine"]
        NodeExp["Node Exporter"]
        cAdv["cAdvisor"]
    end

    subgraph Collector["OpenTelemetry Collector"]
        OTelCol["OTel Collector (4317 / 4318)"]
    end

    subgraph TelemetryStores["Storage Systems"]
        PromDB["Prometheus TSDB (9090)"]
        JaegerDB["Jaeger Tracing (16686)"]
        LokiDB["Loki Logs (3100)"]
    end

    subgraph Dashboards["Visualization & Alerting"]
        GrafanaUI["Grafana Dashboards (3001)"]
        Alertmgr["Alertmanager (9093)"]
    end

    ExpressBE -.->|OTLP Spans & Metrics| OTelCol
    PyAI -.->|OTLP Spans & Metrics| OTelCol
    NodeExp -->|Metrics| PromDB
    cAdv -->|Metrics| PromDB
    ExpressBE -.->|Logs| LokiDB

    OTelCol --> PromDB
    OTelCol --> JaegerDB

    PromDB --> Alertmgr
    PromDB --> GrafanaUI
    JaegerDB --> GrafanaUI
    LokiDB --> GrafanaUI
```

---

## ⚡ 3. Build Performance Optimization Case Study

- **Problem**: `ai-service` Docker build took **20 minutes** in GitHub Actions.
- **Root Cause**:
  1. Default `pip install sentence-transformers` downloaded PyTorch CUDA binaries (**850MB**).
  2. BuildKit used `cache-to: type=gha,mode=max`, spending **10.4 minutes** compressing 2.5GB intermediate layers to GitHub Actions Cache.
- **Fix Applied**:
  1. Added `--extra-index-url https://download.pytorch.org/whl/cpu` to `ai-service/requirements.txt` to pull the **140MB CPU PyTorch wheel**.
  2. Changed BuildKit cache mode to `cache-to: type=gha,mode=min` in `.github/workflows/ci.yaml`.
- **Result**: Reduced build & publish pipeline time from **20 minutes down to 1.5 minutes (92% reduction)**.
