#!/bin/bash
# =============================================================
# scripts/verify-ledger.sh
# AuraBank — Ledger Integrity Verification Script
# =============================================================
# Runs the verify_ledger_integrity() PostgreSQL function
# and reports any imbalanced transactions.
#
# Usage (local):
#   ./scripts/verify-ledger.sh
#
# Usage (against prod ledger_db on RDS):
#   LEDGER_DB_HOST=<rds-endpoint> LEDGER_DB_PASSWORD=<pass> ./scripts/verify-ledger.sh
#
# Expected output after a clean load test:
#   (0 rows)        ← all ledger entries are balanced
# =============================================================

set -e

LEDGER_DB_HOST="${LEDGER_DB_HOST:-localhost}"
LEDGER_DB_PORT="${LEDGER_DB_PORT:-5432}"
LEDGER_DB_USER="${LEDGER_DB_USER:-aurabank}"
LEDGER_DB_PASSWORD="${LEDGER_DB_PASSWORD:-local_dev_password}"
LEDGER_DB_NAME="${LEDGER_DB_NAME:-ledger_db}"

export PGPASSWORD="$LEDGER_DB_PASSWORD"

echo "=================================================="
echo "  AuraBank — Ledger Integrity Verification"
echo "  Host: $LEDGER_DB_HOST:$LEDGER_DB_PORT/$LEDGER_DB_NAME"
echo "  Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "=================================================="

# Run the integrity verification function
echo ""
echo "Running verify_ledger_integrity()..."
echo ""

RESULT=$(psql \
  -h "$LEDGER_DB_HOST" \
  -p "$LEDGER_DB_PORT" \
  -U "$LEDGER_DB_USER" \
  -d "$LEDGER_DB_NAME" \
  --tuples-only \
  --command "SELECT * FROM verify_ledger_integrity();" 2>&1)

ROW_COUNT=$(psql \
  -h "$LEDGER_DB_HOST" \
  -p "$LEDGER_DB_PORT" \
  -U "$LEDGER_DB_USER" \
  -d "$LEDGER_DB_NAME" \
  --tuples-only \
  --command "SELECT COUNT(*) FROM verify_ledger_integrity();" 2>&1 | tr -d ' \n')

echo "Imbalanced transactions found: $ROW_COUNT"
echo ""

if [ "$ROW_COUNT" -eq "0" ]; then
  echo "✅ PASS: All ledger entries are balanced. Zero-sum constraint holds."
  echo ""
  # Also print some stats
  psql \
    -h "$LEDGER_DB_HOST" \
    -p "$LEDGER_DB_PORT" \
    -U "$LEDGER_DB_USER" \
    -d "$LEDGER_DB_NAME" \
    --command "SELECT
      COUNT(DISTINCT transaction_id) AS total_transactions,
      COUNT(*) AS total_entries,
      SUM(amount) AS total_volume
    FROM ledger_entries;" 2>&1
  echo ""
  echo "🎉 Ledger integrity verified successfully."
  exit 0
else
  echo "❌ FAIL: Found $ROW_COUNT imbalanced transaction(s)!"
  echo ""
  echo "Imbalanced transactions:"
  echo "$RESULT"
  echo ""
  echo "⚠️  ACTION REQUIRED: Investigate these transaction IDs immediately."
  exit 1
fi
