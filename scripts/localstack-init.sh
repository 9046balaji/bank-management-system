#!/bin/bash
# =============================================================
# scripts/localstack-init.sh
# Pre-create AWS resources in LocalStack on startup
# =============================================================
# Runs automatically via LocalStack's init hook:
#   /etc/localstack/init/ready.d/init.sh
# =============================================================

set -e

ENDPOINT="http://localhost:4566"
REGION="us-east-1"

echo "=== AuraBank LocalStack Init ==="

# ── S3 Buckets ───────────────────────────────────────────────
echo "[S3] Creating MLflow artifacts bucket..."
aws --endpoint-url="$ENDPOINT" --region="$REGION" \
  s3 mb s3://aurabank-mlflow-artifacts-local \
  --no-verify-ssl 2>/dev/null || echo "[S3] Bucket already exists."

echo "[S3] Creating DB backups bucket..."
aws --endpoint-url="$ENDPOINT" --region="$REGION" \
  s3 mb s3://aurabank-db-backups-local \
  --no-verify-ssl 2>/dev/null || echo "[S3] Bucket already exists."

# ── Secrets Manager ──────────────────────────────────────────
echo "[SecretsManager] Creating payment-service secrets..."
aws --endpoint-url="$ENDPOINT" --region="$REGION" \
  secretsmanager create-secret \
  --name "aurabank/local/payment-service" \
  --secret-string '{"db_password":"local_dev_password","redis_password":"local_redis_password"}' \
  2>/dev/null || echo "[SecretsManager] Secret already exists."

echo "[SecretsManager] Creating auth-service secrets..."
aws --endpoint-url="$ENDPOINT" --region="$REGION" \
  secretsmanager create-secret \
  --name "aurabank/local/auth-service" \
  --secret-string '{"db_password":"local_dev_password","jwt_secret":"local_dev_jwt_secret_change_in_prod"}' \
  2>/dev/null || echo "[SecretsManager] Secret already exists."

echo "[SecretsManager] Creating ledger-service secrets..."
aws --endpoint-url="$ENDPOINT" --region="$REGION" \
  secretsmanager create-secret \
  --name "aurabank/local/ledger-service" \
  --secret-string '{"db_password":"local_dev_password"}' \
  2>/dev/null || echo "[SecretsManager] Secret already exists."

echo "=== LocalStack init complete ==="
