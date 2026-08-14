# PowerShell script to commit every Phase 5 file individually

$phase5_commits = @(
    @{ file = "src/ai-fraud-service/models/fallback.py"; msg = "feat(ai): add rule-based fallback evaluation logic for fraud engine" },
    @{ file = "src/ai-fraud-service/models/fraud_model.py"; msg = "feat(ai): add XGBoost fraud prediction model loader and inference wrapper" },
    @{ file = "src/ai-fraud-service/drift_monitor.py"; msg = "feat(ai): add Prometheus metrics for ML model drift and fallback tracking" },
    @{ file = "src/ai-fraud-service/rest_server.py"; msg = "feat(ai): implement FastAPI REST server for health probes and Prometheus metrics" },
    @{ file = "src/ai-fraud-service/grpc_server.py"; msg = "feat(ai): implement gRPC FraudServicer with circuit breaker fallback" },
    @{ file = "src/ai-fraud-service/main.py"; msg = "feat(ai): implement concurrent asyncio main entrypoint for AI Fraud Service" },
    @{ file = "src/ai-fraud-service/tests/test_fraud_model.py"; msg = "test(ai): add unit tests for fallback fraud evaluation" },
    @{ file = "src/ai-fraud-service/Dockerfile"; msg = "feat(ai): add Dockerfile for AI Fraud Engine microservice" },
    @{ file = "helm/ai-fraud-service/Chart.yaml"; msg = "feat(ai): add Helm Chart.yaml for AI Fraud Engine Service" },
    @{ file = "helm/ai-fraud-service/values.yaml"; msg = "feat(ai): add Helm values.yaml for AI Fraud Engine Service" },

    @{ file = "src/genai-advisor-service/migrations/000001_init_schema.up.sql"; msg = "feat(genai): add vector_db schema migration (feedback_corrections, financial_knowledge with pgvector IVFFlat index)" },
    @{ file = "src/genai-advisor-service/migrations/000001_init_schema.down.sql"; msg = "feat(genai): add vector_db rollback migration" },
    @{ file = "src/genai-advisor-service/requirements.txt"; msg = "feat(genai): add requirements.txt for GenAI Financial Advisor Service" },
    @{ file = "src/genai-advisor-service/main.py"; msg = "feat(genai): implement FastAPI GenAI Advisor Service with RAG and pgvector support" },
    @{ file = "src/genai-advisor-service/Dockerfile"; msg = "feat(genai): add Dockerfile for GenAI Advisor Service" },
    @{ file = "helm/genai-advisor-service/Chart.yaml"; msg = "feat(genai): add Helm Chart.yaml for GenAI Advisor Service" },
    @{ file = "helm/genai-advisor-service/values.yaml"; msg = "feat(genai): add Helm values.yaml for GenAI Advisor Service" }
)

foreach ($item in $phase5_commits) {
    if (Test-Path $item.file) {
        Write-Host "Staging: $($item.file)"
        git add $item.file
        git commit -m $item.msg
    } else {
        Write-Host "Skipping (not found): $($item.file)"
    }
}

git add scripts/commit_phase5.ps1
git commit -m "chore(scripts): add PowerShell helper script for Phase 5 individual commits"

Write-Host "All Phase 5 individual commits completed successfully!"
