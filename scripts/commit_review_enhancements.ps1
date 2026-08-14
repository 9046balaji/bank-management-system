# PowerShell script to commit final review enhancements individually

$review_commits = @(
    @{ file = "src/ai-fraud-service/mlflow_client.py"; msg = "feat(ai): add MLflow tracking and model registry client wrapper" },
    @{ file = "src/ai-fraud-service/proto/fraud_pb2.py"; msg = "feat(ai): add Python protobuf message definitions for fraud.proto" },
    @{ file = "src/ai-fraud-service/proto/fraud_pb2_grpc.py"; msg = "feat(ai): add Python gRPC servicer stub interface for fraud.proto" },
    @{ file = "monitoring/grafana/dashboards/fraud-engine.json"; msg = "feat(monitoring): add Grafana dashboard for AI Fraud Engine drift and latency" }
)

foreach ($item in $review_commits) {
    if (Test-Path $item.file) {
        Write-Host "Staging: $($item.file)"
        git add $item.file
        git commit -m $item.msg
    }
}

git add scripts/commit_review_enhancements.ps1
git commit -m "chore(scripts): add PowerShell helper script for final review enhancement commits"

Write-Host "All final review enhancement commits completed successfully!"
