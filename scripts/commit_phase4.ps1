# PowerShell script to commit every Phase 4 file individually

$phase4_commits = @(
    @{ file = "monitoring/prometheus/alerts.yml"; msg = "feat(monitoring): update Alertmanager alert rules for SLO burn rates, gRPC latency, and Kafka lag" },
    @{ file = "monitoring/grafana/dashboards/slo-error-budget.json"; msg = "feat(monitoring): add Grafana SLO & 30-day error budget dashboard" },
    @{ file = "monitoring/grafana/dashboards/payment-overview.json"; msg = "feat(monitoring): add Grafana Payment Service operational dashboard" },
    @{ file = "monitoring/grafana/dashboards/kafka-lag.json"; msg = "feat(monitoring): add Grafana Kafka consumer lag dashboard" },
    @{ file = "chaos/litmus/pod-crash-payment.yaml"; msg = "feat(chaos): add LitmusChaos experiment for payment pod crash resilience" },
    @{ file = "chaos/litmus/latency-inject-ledger.yaml"; msg = "feat(chaos): add LitmusChaos experiment for 500ms ledger gRPC latency injection" },
    @{ file = "chaos/litmus/kafka-broker-kill.yaml"; msg = "feat(chaos): add LitmusChaos experiment for Kafka broker kill resilience" },
    @{ file = "chaos/results/mttr_benchmarks.md"; msg = "docs(chaos): add MTTR benchmarks report for all 5 failure injection scenarios" }
)

foreach ($item in $phase4_commits) {
    if (Test-Path $item.file) {
        Write-Host "Staging: $($item.file)"
        git add $item.file
        git commit -m $item.msg
    } else {
        Write-Host "Skipping (not found): $($item.file)"
    }
}

git add scripts/commit_phase4.ps1
git commit -m "chore(scripts): add PowerShell helper script for Phase 4 individual commits"

Write-Host "All Phase 4 individual commits completed successfully!"
