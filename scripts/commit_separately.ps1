# PowerShell script to commit every modified/untracked file individually

$commits = @(
    @{ file = ".gitignore"; msg = "chore: update .gitignore to allow cross-domain-coupling doc" },
    @{ file = "monolith_to_microservices.md"; msg = "docs: add monolith to microservices migration guide blueprint v2" },
    @{ file = "monolith_to_microservices_architecture_report.md"; msg = "docs: add comprehensive technical architecture report v2" },
    @{ file = "implementation_plan.md"; msg = "docs: add 5-phase production devops and AI platform plan v2" },
    @{ file = "devops_ai_resume_showcase_guide.md"; msg = "docs: add devops & AI resume showcase guide" },
    @{ file = "docker-compose.local.yaml"; msg = "feat(infra): add local dev docker-compose stack with Kafka, LocalStack, pgvector, and MLflow" },
    @{ file = "docker-compose.yml"; msg = "refactor(infra): update base docker-compose configuration" },
    @{ file = "scripts/init-dbs.sql"; msg = "feat(db): add init-dbs.sql script to create microservice logical databases" },
    @{ file = "scripts/localstack-init.sh"; msg = "feat(infra): add localstack-init.sh hook for S3 and Secrets Manager" },
    @{ file = "scripts/verify-ledger.sh"; msg = "feat(ledger): add verify-ledger.sh integrity check script" },
    @{ file = "monitoring/otel-collector/local-config.yaml"; msg = "feat(observability): add local OTel collector config with tail sampling and SpanMetrics" },
    @{ file = "monitoring/otel-collector/otelcol-config.yml"; msg = "feat(observability): update OTel collector config" },
    @{ file = "monitoring/prometheus/prometheus.local.yml"; msg = "feat(observability): add Prometheus local config with SLO rule loading" },
    @{ file = "monitoring/prometheus/prometheus.yml"; msg = "feat(observability): update Prometheus config" },
    @{ file = "monitoring/prometheus/slo-rules.yaml"; msg = "feat(observability): add Prometheus SLO recording rules" },
    @{ file = "monitoring/loki/loki-config.yaml"; msg = "feat(observability): add Loki log aggregation config" },
    @{ file = "monitoring/grafana/provisioning/datasources/datasources.yaml"; msg = "feat(observability): add Grafana datasource provisioning with trace-to-log linkage" },
    @{ file = "monitoring/grafana/provisioning/dashboards/dashboards.yaml"; msg = "feat(observability): add Grafana dashboard provisioning" },
    @{ file = "load-tests/k6/auth-flow.js"; msg = "test(load): add k6 auth-flow load test script" },
    @{ file = "load-tests/k6/payment-load.js"; msg = "test(load): add k6 payment-load test script for baseline and 5k RPS" },
    @{ file = "docs/cross-domain-coupling.md"; msg = "docs: add cross-domain database coupling audit report" },
    @{ file = "chaos/results/baseline.md"; msg = "docs(chaos): add Phase 0 baseline test results" },
    @{ file = "ai-service/requirements.txt"; msg = "deps(ai-service): update requirements.txt with FastAPI, gRPC, XGBoost, MLflow, and pgvector" },
    @{ file = "backend/package.json"; msg = "deps(backend): update package.json with kafkajs and gRPC dependencies" },
    @{ file = "backend/src/utils/telemetry.ts"; msg = "feat(backend): add OpenTelemetry tracing helper" }
)

foreach ($item in $commits) {
    if (Test-Path $item.file) {
        Write-Host "Staging: $($item.file)"
        git add $item.file
        git commit -m $item.msg
    } else {
        Write-Host "Skipping (not found): $($item.file)"
    }
}

# Also commit the commit script itself
git add scripts/commit_separately.ps1
git commit -m "chore(scripts): add PowerShell helper script for committing Phase 0 files individually"

Write-Host "All individual commits completed successfully!"
