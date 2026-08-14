# Cross-Domain DB Coupling Audit
> **Phase 0.4 Deliverable** — Documents all cross-domain database queries in the monolith
> This is the "before" story that proves the migration is necessary.

---

## What This Document Is

Before extracting any service, we must identify every place where one domain's route handler queries another domain's tables. These are **hidden couplings** that must be broken during migration — each one represents work that needs careful handling (event-driven replacement, gRPC calls, or data denormalization).

---

## Shared Database (Monolith)

The monolith runs against a single `aurabank` PostgreSQL database with these tables:

| Table | Domain Owner | Notes |
|---|---|---|
| `users` | Auth | user identity, roles, KYC status |
| `accounts` | Ledger | bank accounts, balances |
| `transactions` | Payment | payment records |
| `ledger_entries` | Ledger | double-entry records |
| `atm_codes` | Payment | ATM withdrawal tokens |
| `cards` | Card | card records |
| `loans` | Loan | loan applications + repayments |
| `loan_repayments` | Loan | EMI payment history |
| `support_tickets` | Support | customer tickets |
| `feedback` | Support | 1-5 star feedback |
| `chat_messages` | Support | staff chat |
| `system_config` | Auth (admin) | key-value config store |

---

## Route-by-Route Coupling Audit

### `routes/analytics.ts` — ⚠️ HIGH COUPLING

This route reads from **multiple domains** — the most problematic route for migration.

```
Cross-domain reads:
  ✗ reads transactions table   → belongs to Payment domain
  ✗ reads accounts table       → belongs to Ledger domain
  ✗ reads loans table          → belongs to Loan domain
  ✗ reads cards table          → belongs to Card domain
```

**Migration approach**: Analytics Service consumes **Kafka events** instead of direct DB reads:
- `payment.completed` → build spending aggregations
- `loan.disbursed` / `loan.repayment.received` → loan analytics
- `card.issued` → card analytics

**Impact**: HIGH — Analytics is the most coupled route. Must be last in Phase 3.

---

### `routes/admin-ai.ts` — ⚠️ HIGH COUPLING

The admin AI route orchestrates calls across many domains.

```
Cross-domain reads:
  ✗ reads transactions table   → Payment domain
  ✗ reads accounts table       → Ledger domain
  ✗ reads loans table          → Loan domain
  ✗ reads support_tickets      → Support domain
  ✗ calls ai-service HTTP      → will become gRPC to Fraud Engine
```

**Migration approach**: Admin metrics endpoint on Analytics Service (consumes Kafka). AI calls go direct gRPC to Fraud/GenAI services.

---

### `routes/transactions.ts` — ⚠️ MEDIUM COUPLING

```
Cross-domain reads:
  ✗ reads accounts table to check balance before transfer → Ledger domain
  ✗ reads users table to verify recipient exists          → Auth domain
  ✓ writes transactions table                             → own domain (Payment)
  ✓ writes ledger_entries                                 → will become gRPC to Ledger
```

**Migration approach**: 
- Balance check → gRPC `GetAccountBalance` to Ledger Service
- Recipient verification → gRPC or REST call to Auth Service (or JWT claim)
- Double-entry write → gRPC `ExecuteDoubleEntry` to Ledger Service

---

### `routes/loans.ts` — ⚠️ MEDIUM COUPLING

```
Cross-domain reads:
  ✗ reads accounts table (balance for loan eligibility)   → Ledger domain
  ✗ calls ai-service for risk scoring (HTTP)              → will become gRPC to Fraud Engine
  ✓ reads/writes loans table                              → own domain (Loan)
  ✓ reads/writes loan_repayments                          → own domain (Loan)
```

**Migration approach**:
- Balance check → gRPC `GetAccountBalance` to Ledger Service
- AI risk scoring → gRPC `EvaluateRisk` to Fraud Engine

---

### `routes/accounts.ts` — ⚠️ MEDIUM COUPLING

```
Cross-domain reads:
  ✗ joins with transactions to show recent history        → Payment domain
  ✓ reads/writes accounts table                           → own domain (Ledger)
```

**Migration approach**: Recent transactions will be fetched separately by the frontend (two API calls: one to Ledger for balance, one to Payment for transactions). Dashboard.tsx already designed this way.

---

### `routes/users.ts` — ✅ LOW COUPLING

```
Cross-domain reads:
  ✗ creates account on registration                       → Ledger domain
  ✓ reads/writes users table                              → own domain (Auth)
  ✓ reads/writes kyc documents                            → own domain (Auth)
```

**Migration approach**: On user registration in Auth Service, publish a `user.registered` event → Ledger Service creates the account asynchronously. Or: Auth Service calls Ledger Service REST/gRPC at registration time.

---

### `routes/withdrawals.ts` — ✅ LOW COUPLING

```
Cross-domain reads:
  ✗ reads accounts to verify balance before ATM token     → Ledger domain
  ✓ reads/writes atm_codes                                → own domain (Payment)
```

**Migration approach**: Balance check → gRPC `GetAccountBalance` to Ledger Service.

---

### `routes/cards.ts` — ✅ LOW COUPLING

```
Cross-domain reads:
  ✗ reads accounts to check eligibility                   → Ledger domain
  ✓ reads/writes cards table                              → own domain (Card)
```

**Migration approach**: Eligibility check → gRPC call to Ledger Service.

---

### `routes/support.ts` — ✅ NO COUPLING

```
Cross-domain reads: NONE
✓ reads/writes support_tickets                            → own domain (Support)
✓ reads/writes feedback                                   → own domain (Support)
✓ reads/writes chat_messages                              → own domain (Support)
```

**Migration approach**: Clean extraction, no cross-domain work.

---

### `routes/ledger.ts` — ✅ NO COUPLING (admin-only)

```
Cross-domain reads: NONE
✓ reads ledger_entries and accounts                       → own domain (Ledger)
```

---

### `routes/config.ts` — ✅ NO COUPLING

```
Cross-domain reads: NONE
✓ reads/writes system_config                              → own domain (Auth)
```

---

### `routes/chat.ts` — ✅ NO COUPLING

```
Cross-domain reads: NONE
✓ reads/writes chat_messages                              → own domain (Support)
```

---

### `routes/ml.ts` — DEPRECATED

Removed entirely. ML calls will go direct via gRPC:
- Payment → Fraud Engine (EvaluateRisk)
- Loan → Fraud Engine (EvaluateRisk)

---

## Coupling Summary

| Coupling Level | Routes | Migration Complexity |
|---|---|---|
| **High** (multi-domain reads) | `analytics.ts`, `admin-ai.ts` | Kafka event-driven replacement |
| **Medium** (1-2 cross-domain reads) | `transactions.ts`, `loans.ts`, `accounts.ts` | gRPC client calls |
| **Low** (1 cross-domain read) | `users.ts`, `withdrawals.ts`, `cards.ts` | Single gRPC call |
| **None** | `support.ts`, `ledger.ts`, `config.ts`, `chat.ts` | Clean extraction |

---

## Migration Order Recommendation

Based on coupling analysis:
1. **Auth Service** — low coupling, unblocks everything (JWT for other services)
2. **Ledger Service** — needed by Payment, Card, Loan via gRPC
3. **Payment Service** — calls Ledger + Fraud via gRPC
4. **Card Service** — low coupling once Ledger is ready
5. **Support Service** — zero coupling, easy win
6. **Loan Service** — needs Fraud Engine ready for risk scoring
7. **Analytics Service** — last, depends on Kafka events from all services

---

*Generated: Phase 0 audit | AuraBank Migration Project*
