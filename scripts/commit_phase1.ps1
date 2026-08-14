# PowerShell script to commit every Phase 1 file individually

$phase1_commits = @(
    @{ file = "proto/buf.yaml"; msg = "feat(proto): add buf CLI config for Protobuf linting and stub generation" },
    @{ file = "proto/ledger.proto"; msg = "feat(proto): add Core Ledger Service gRPC interface definitions" },
    @{ file = "proto/fraud.proto"; msg = "feat(proto): add AI Fraud Engine gRPC interface definitions" },
    @{ file = "openapi/.spectral.yaml"; msg = "feat(openapi): add Spectral linting ruleset for REST APIs" },
    @{ file = "openapi/auth.yaml"; msg = "feat(openapi): add OpenAPI 3.0 spec for Auth & User Service" },
    @{ file = "openapi/payment.yaml"; msg = "feat(openapi): add OpenAPI 3.0 spec for Payment Service" },
    @{ file = "openapi/card.yaml"; msg = "feat(openapi): add OpenAPI 3.0 spec for Card Service" },
    @{ file = "openapi/loan.yaml"; msg = "feat(openapi): add OpenAPI 3.0 spec for Loan Service" },
    @{ file = "openapi/support.yaml"; msg = "feat(openapi): add OpenAPI 3.0 spec for Support Service" },
    @{ file = "terraform/modules/vpc/main.tf"; msg = "feat(terraform): add VPC module main configuration" },
    @{ file = "terraform/modules/vpc/variables.tf"; msg = "feat(terraform): add VPC module variables" },
    @{ file = "terraform/modules/vpc/outputs.tf"; msg = "feat(terraform): add VPC module outputs" },
    @{ file = "terraform/modules/budget/main.tf"; msg = "feat(terraform): add AWS budget alerts module main config" },
    @{ file = "terraform/modules/budget/variables.tf"; msg = "feat(terraform): add AWS budget alerts module variables" },
    @{ file = "terraform/environments/prod/main.tf"; msg = "feat(terraform): add prod environment infrastructure main config" },
    @{ file = "terraform/environments/prod/variables.tf"; msg = "feat(terraform): add prod environment variables" },
    @{ file = "gitops/namespaces/banking-namespace.yaml"; msg = "feat(gitops): add banking namespace manifest" },
    @{ file = "gitops/namespaces/observability-namespace.yaml"; msg = "feat(gitops): add observability namespace manifest" },
    @{ file = "gitops/apps/banking-namespace.yaml"; msg = "feat(gitops): add ArgoCD Application manifest for banking microservices" },
    @{ file = "gitops/external-secrets/cluster-secret-store.yaml"; msg = "feat(gitops): add External Secrets Operator ClusterSecretStore manifest" },
    @{ file = "gitops/external-secrets/payment-service-secret.yaml"; msg = "feat(gitops): add ExternalSecret manifest for payment-service" },
    @{ file = ".github/workflows/ci.yaml"; msg = "ci: add GitHub Actions CI matrix workflow for proto, openapi, tests, and helm" },
    @{ file = ".github/workflows/cluster-teardown.yaml"; msg = "ci: add scheduled cluster teardown workflow for cost control" },
    @{ file = "helm/_library/Chart.yaml"; msg = "feat(helm): add base library chart definition" },
    @{ file = "helm/_library/templates/_deployment.yaml"; msg = "feat(helm): add shared deployment template with probes, migration init-containers, and PDB constraints" }
)

foreach ($item in $phase1_commits) {
    if (Test-Path $item.file) {
        Write-Host "Staging: $($item.file)"
        git add $item.file
        git commit -m $item.msg
    } else {
        Write-Host "Skipping (not found): $($item.file)"
    }
}

# Clean up deleted obsolete file if exists
if (Test-Path ".github/workflows/ci.yml") {
    git rm .github/workflows/ci.yml
    git commit -m "ci: remove obsolete ci.yml in favor of ci.yaml"
}

git add scripts/commit_phase1.ps1
git commit -m "chore(scripts): add PowerShell helper script for Phase 1 individual commits"

Write-Host "All Phase 1 individual commits completed successfully!"
