# PowerShell script to commit every Phase 2 file individually

$phase2_commits = @(
    @{ file = "src/auth-service/migrations/000001_init_schema.up.sql"; msg = "feat(auth): add user_db schema migration (users, refresh_tokens, kyc_documents, system_config)" },
    @{ file = "src/auth-service/migrations/000001_init_schema.down.sql"; msg = "feat(auth): add user_db rollback migration" },
    @{ file = "src/auth-service/package.json"; msg = "feat(auth): add package.json dependencies for Auth Service microservice" },
    @{ file = "src/auth-service/src/index.ts"; msg = "feat(auth): implement Auth Service with health probes, Postgres user_db connection, and auth endpoints" },
    @{ file = "src/auth-service/Dockerfile"; msg = "feat(auth): add multi-stage Dockerfile for Auth Service" },
    @{ file = "helm/auth-service/Chart.yaml"; msg = "feat(auth): add Helm Chart.yaml for Auth Service" },
    @{ file = "helm/auth-service/values.yaml"; msg = "feat(auth): add Helm values.yaml for Auth Service" },

    @{ file = "src/ledger-service/migrations/000001_init_schema.up.sql"; msg = "feat(ledger): add ledger_db schema migration with immutability trigger, system account seeds, and integrity check function" },
    @{ file = "src/ledger-service/migrations/000001_init_schema.down.sql"; msg = "feat(ledger): add ledger_db rollback migration" },
    @{ file = "src/ledger-service/go.mod"; msg = "feat(ledger): add go.mod module file for Core Ledger Service" },
    @{ file = "src/ledger-service/cmd/server/main.go"; msg = "feat(ledger): implement Core Ledger Service main server with HTTP health probes and gRPC interface" },
    @{ file = "src/ledger-service/Dockerfile"; msg = "feat(ledger): add multi-stage Dockerfile for Core Ledger Service" },
    @{ file = "helm/ledger-service/Chart.yaml"; msg = "feat(ledger): add Helm Chart.yaml for Core Ledger Service" },
    @{ file = "helm/ledger-service/values.yaml"; msg = "feat(ledger): add Helm values.yaml for Core Ledger Service" },

    @{ file = "src/payment-service/migrations/000001_init_schema.up.sql"; msg = "feat(payment): add payments_db schema migration (payments, outbox_events, atm_codes)" },
    @{ file = "src/payment-service/migrations/000001_init_schema.down.sql"; msg = "feat(payment): add payments_db rollback migration" },
    @{ file = "src/payment-service/go.mod"; msg = "feat(payment): add go.mod module file for Payment Service" },
    @{ file = "src/payment-service/cmd/server/main.go"; msg = "feat(payment): implement Payment Service main server with health probes and payments_db connection" },
    @{ file = "src/payment-service/Dockerfile"; msg = "feat(payment): add multi-stage Dockerfile for Payment Service" },
    @{ file = "helm/payment-service/Chart.yaml"; msg = "feat(payment): add Helm Chart.yaml for Payment Service" },
    @{ file = "helm/payment-service/values.yaml"; msg = "feat(payment): add Helm values.yaml for Payment Service" },
    @{ file = "helm/payment-service/templates/networkpolicy.yaml"; msg = "feat(payment): add Kubernetes NetworkPolicy manifest with explicit ingress/egress permissions" },

    @{ file = "src/outbox-worker/go.mod"; msg = "feat(outbox): add go.mod module file for Transactional Outbox Worker" },
    @{ file = "src/outbox-worker/cmd/worker/main.go"; msg = "feat(outbox): implement Outbox Worker with FOR UPDATE SKIP LOCKED atomic polling loop" },
    @{ file = "src/outbox-worker/Dockerfile"; msg = "feat(outbox): add multi-stage Dockerfile for Outbox Worker" },
    @{ file = "helm/outbox-worker/Chart.yaml"; msg = "feat(outbox): add Helm Chart.yaml for Outbox Worker" },
    @{ file = "helm/outbox-worker/values.yaml"; msg = "feat(outbox): add Helm values.yaml for Outbox Worker" },

    @{ file = "src/notification-worker/go.mod"; msg = "feat(notification): add go.mod module file for Notification Worker" },
    @{ file = "src/notification-worker/cmd/worker/main.go"; msg = "feat(notification): implement Notification Worker Kafka subscriber server" },
    @{ file = "src/notification-worker/Dockerfile"; msg = "feat(notification): add multi-stage Dockerfile for Notification Worker" },
    @{ file = "helm/notification-worker/Chart.yaml"; msg = "feat(notification): add Helm Chart.yaml for Notification Worker" },
    @{ file = "helm/notification-worker/values.yaml"; msg = "feat(notification): add Helm values.yaml for Notification Worker" }
)

foreach ($item in $phase2_commits) {
    if (Test-Path $item.file) {
        Write-Host "Staging: $($item.file)"
        git add $item.file
        git commit -m $item.msg
    } else {
        Write-Host "Skipping (not found): $($item.file)"
    }
}

git add scripts/commit_phase2.ps1
git commit -m "chore(scripts): add PowerShell helper script for Phase 2 individual commits"

Write-Host "All Phase 2 individual commits completed successfully!"
