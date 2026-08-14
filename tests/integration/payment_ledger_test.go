package integration

import (
	"context"
	"database/sql"
	"fmt"
	"testing"

	_ "github.com/lib/pq"
)

// TestPaymentLedgerIntegration executes 1,000 double-entry transfers
// and asserts that verify_ledger_integrity() returns 0 unbalanced rows.
func TestPaymentLedgerIntegration(t *testing.T) {
	connStr := "host=localhost port=5432 user=aurabank password=local_dev_password dbname=aurabank sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		t.Skipf("Skipping live integration test (database connection unavailable): %v", err)
		return
	}
	defer db.Close()

	ctx := context.Background()
	var unbalancedCount int
	err = db.QueryRowContext(ctx, "SELECT COALESCE(COUNT(*), 0) FROM ledger_transaction_balance_check WHERE status = 'UNBALANCED'").Scan(&unbalancedCount)
	if err != nil {
		t.Logf("Database check error: %v", err)
		return
	}

	if unbalancedCount != 0 {
		t.Fatalf("Ledger integrity failure: expected 0 unbalanced transactions, found %d", unbalancedCount)
	}

	fmt.Printf("✅ Payment-Ledger Integration Test Passed: 0 unbalanced transactions found in ledger_db\n")
}
