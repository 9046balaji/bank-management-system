# PowerShell script to commit every Phase 3 file individually

$phase3_commits = @(
    @{ file = "src/card-service/migrations/000001_init_schema.up.sql"; msg = "feat(card): add cards_db schema migration (cards, card_applications)" },
    @{ file = "src/card-service/migrations/000001_init_schema.down.sql"; msg = "feat(card): add cards_db rollback migration" },
    @{ file = "src/card-service/package.json"; msg = "feat(card): add package.json dependencies for Card Management Service" },
    @{ file = "src/card-service/src/index.ts"; msg = "feat(card): implement Card Management Service with health probes and card management endpoints" },
    @{ file = "src/card-service/Dockerfile"; msg = "feat(card): add multi-stage Dockerfile for Card Management Service" },
    @{ file = "helm/card-service/Chart.yaml"; msg = "feat(card): add Helm Chart.yaml for Card Management Service" },
    @{ file = "helm/card-service/values.yaml"; msg = "feat(card): add Helm values.yaml for Card Management Service" },

    @{ file = "src/loan-service/migrations/000001_init_schema.up.sql"; msg = "feat(loan): add loans_db schema migration (loans, loan_schedules, repayments)" },
    @{ file = "src/loan-service/migrations/000001_init_schema.down.sql"; msg = "feat(loan): add loans_db rollback migration" },
    @{ file = "src/loan-service/go.mod"; msg = "feat(loan): add go.mod module file for Loan & Credit Service" },
    @{ file = "src/loan-service/cmd/server/main.go"; msg = "feat(loan): implement Loan Service main server with health probes and loans_db connection" },
    @{ file = "src/loan-service/Dockerfile"; msg = "feat(loan): add multi-stage Dockerfile for Loan Service" },
    @{ file = "helm/loan-service/Chart.yaml"; msg = "feat(loan): add Helm Chart.yaml for Loan Service" },
    @{ file = "helm/loan-service/values.yaml"; msg = "feat(loan): add Helm values.yaml for Loan Service" },

    @{ file = "src/support-service/migrations/000001_init_schema.up.sql"; msg = "feat(support): add support_db schema migration (tickets, ticket_comments, feedback, faqs, chat_messages)" },
    @{ file = "src/support-service/migrations/000001_init_schema.down.sql"; msg = "feat(support): add support_db rollback migration" },
    @{ file = "src/support-service/package.json"; msg = "feat(support): add package.json dependencies for Customer Support Service" },
    @{ file = "src/support-service/src/index.ts"; msg = "feat(support): implement Customer Support Service with health probes and ticketing endpoints" },
    @{ file = "src/support-service/Dockerfile"; msg = "feat(support): add multi-stage Dockerfile for Customer Support Service" },
    @{ file = "helm/support-service/Chart.yaml"; msg = "feat(support): add Helm Chart.yaml for Customer Support Service" },
    @{ file = "helm/support-service/values.yaml"; msg = "feat(support): add Helm values.yaml for Customer Support Service" },

    @{ file = "src/analytics-service/migrations/000001_init_schema.up.sql"; msg = "feat(analytics): add analytics_db schema migration (spending_aggregations, daily_cashflow, executive_metrics)" },
    @{ file = "src/analytics-service/migrations/000001_init_schema.down.sql"; msg = "feat(analytics): add analytics_db rollback migration" },
    @{ file = "src/analytics-service/go.mod"; msg = "feat(analytics): add go.mod module file for Analytics & Reporting Service" },
    @{ file = "src/analytics-service/cmd/server/main.go"; msg = "feat(analytics): implement Analytics Service main server with Kafka event consumer and analytics_db connection" },
    @{ file = "src/analytics-service/Dockerfile"; msg = "feat(analytics): add multi-stage Dockerfile for Analytics Service" },
    @{ file = "helm/analytics-service/Chart.yaml"; msg = "feat(analytics): add Helm Chart.yaml for Analytics Service" },
    @{ file = "helm/analytics-service/values.yaml"; msg = "feat(analytics): add Helm values.yaml for Analytics Service" }
)

foreach ($item in $phase3_commits) {
    if (Test-Path $item.file) {
        Write-Host "Staging: $($item.file)"
        git add $item.file
        git commit -m $item.msg
    } else {
        Write-Host "Skipping (not found): $($item.file)"
    }
}

git add scripts/commit_phase3.ps1
git commit -m "chore(scripts): add PowerShell helper script for Phase 3 individual commits"

Write-Host "All Phase 3 individual commits completed successfully!"
