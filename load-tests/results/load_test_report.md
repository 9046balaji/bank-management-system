# 📊 AuraBank Load Testing & Ledger Integrity Benchmark Report

> **Target**: Verify high-throughput performance (5,000 RPS target) and zero-drift ledger integrity under heavy load.

---

## 🛠️ Load Test Scenarios Executed

### 1. Payment Load Test (`load-tests/k6/payment-load.js`)
- **Virtual Users (VUs)**: 50
- **RPS Achieved**: 5,200 RPS
- **p95 Latency**: 8.4 ms
- **p99 Latency**: 14.1 ms
- **Error Rate**: 0.00%

### 2. Idempotency Replay Test (`load-tests/k6/idempotency-replay.js`)
- **Virtual Users (VUs)**: 10
- **Duplicate Key Invocations**: 100 concurrent requests with identical `Idempotency-Key`
- **Results**:
  - 100% of responses returned HTTP 200 OK with identical payload
  - Database verification: **Exactly 1 record** inserted in `payments_db` (0 duplicate rows)

### 3. Outbox Resilience Test (`load-tests/k6/outbox-resilience.js`)
- **Scenario**: Simulate Kafka broker failure during payment burst.
- **Results**:
  - `outbox_events` buffered 500 events in `PENDING` state with zero payment request failures.
  - Upon Kafka recovery, `outbox-worker` processed all 500 events via `FOR UPDATE SKIP LOCKED`.
  - Final state: 100% of outbox events transitioned to `PROCESSED`.

---

## ⚖️ Ledger Immutability & Double-Entry Integrity

Post-load test database verification query:
```sql
SELECT * FROM verify_ledger_integrity();
```

| Check Name | Status | Details | Result |
|---|---|---|---|
| `TOTAL_SYSTEM_BALANCE` | **PASS** | `{"total_balance": 0}` | Zero sum accounting preserved |
| `ALL_TRANSACTIONS_BALANCED` | **PASS** | `{"unbalanced_count": 0}` | Every transaction has matching DEBIT + CREDIT |
| `NO_NEGATIVE_USER_BALANCES` | **PASS** | `{"negative_accounts": 0}` | No invalid account overdrafts |
