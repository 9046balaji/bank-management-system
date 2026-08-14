# PowerShell script to commit final verification files individually

$final_commits = @(
    @{ file = "src/analytics-service/migrations/000001_init_schema.up.sql"; msg = "feat(analytics): update migration up SQL for analytics_db" },
    @{ file = "src/analytics-service/migrations/000001_init_schema.down.sql"; msg = "feat(analytics): add migration down SQL for analytics_db" },
    @{ file = "src/card-service/migrations/000001_init_schema.up.sql"; msg = "feat(card): update migration up SQL for cards_db" },
    @{ file = "src/card-service/migrations/000001_init_schema.down.sql"; msg = "feat(card): add migration down SQL for cards_db" },
    @{ file = "src/loan-service/migrations/000001_init_schema.up.sql"; msg = "feat(loan): update migration up SQL for loans_db" },
    @{ file = "src/loan-service/migrations/000001_init_schema.down.sql"; msg = "feat(loan): add migration down SQL for loans_db" },
    @{ file = "src/support-service/migrations/000001_init_schema.up.sql"; msg = "feat(support): update migration up SQL for support_db" },
    @{ file = "src/support-service/migrations/000001_init_schema.down.sql"; msg = "feat(support): add migration down SQL for support_db" },
    @{ file = "src/ai-fraud-service/migrations/000001_init_schema.up.sql"; msg = "feat(ai): add migration up SQL for ai-fraud-service" },
    @{ file = "src/ai-fraud-service/migrations/000001_init_schema.down.sql"; msg = "feat(ai): add migration down SQL for ai-fraud-service" },

    @{ file = "tests/integration/payment_ledger_test.go"; msg = "test(integration): add Go Payment to Ledger gRPC integration test" },
    @{ file = "load-tests/k6/outbox-resilience.js"; msg = "test(load): add k6 outbox worker resilience and broker failure test" },
    @{ file = "load-tests/results/load_test_report.md"; msg = "docs(load): add load testing and ledger integrity benchmark report" }
)

foreach ($item in $final_commits) {
    if (Test-Path $item.file) {
        Write-Host "Staging: $($item.file)"
        git add $item.file
        git commit -m $item.msg
    }
}

git add scripts/commit_final_verification.ps1
git commit -m "chore(scripts): add PowerShell helper script for final verification commits"

Write-Host "All final verification individual commits completed successfully!"
