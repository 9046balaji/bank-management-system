# 🚀 Aura Bank - Express Backend Core Service

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-20.0-339933?style=flat-square&logo=node.js)
![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat-square&logo=express)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square&logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis)

**High-Performance Express Microservice Handling Double-Entry Ledger Bookkeeping, JWT Authentication, Cardless ATM Withdrawals, and Financial Domain Logic**

</div>

---

## 📖 Overview

The **Aura Bank Backend Service** (`backend/src`) is the central REST API gateway and core banking server. Built with Node.js, Express, and TypeScript, it manages:
- **Double-Entry Ledger Accounting**: Immutable debit/credit bookkeeping ensuring zero balance drift.
- **Cardless ATM Withdrawals**: 6-digit SHA-256 hashed single-use ATM redemption tokens (`atm_codes`).
- **Card Management**: Credit and debit card issuance, limit controls, card freezing, and PIN security.
- **Loan & Repayment Engine**: EMI schedule calculation, payment tracking, and automated AI risk score evaluation.
- **Idempotency & Resilience**: Idempotency key verification via Redis, circuit breaker pattern for external AI calls (`circuitBreaker.ts`), and rate limiting.

---

## 🏗️ Directory Layout

```text
backend/src/
├── controllers/          # Business logic handlers
├── db/                   # PostgreSQL connection pool & schema runner
├── middleware/           # JWT auth, rate limiters, security headers
├── routes/               # Express REST endpoint modules (13 domains)
│   ├── accounts.ts       # Account balance & account creation
│   ├── admin-ai.ts       # Admin analytics & system configuration
│   ├── analytics.ts      # Spending trends & category summaries
│   ├── cards.ts          # Credit/debit card lifecycle & PINs
│   ├── chat.ts           # Customer support chat interactions
│   ├── config.ts         # System parameters & maintenance mode
│   ├── ledger.ts         # Double-entry ledger audit endpoints
│   ├── loans.ts          # Active loans & EMI payment schedules
│   ├── ml.ts             # ML proxy endpoints to AI service
│   ├── support.ts        # Customer tickets, comments & FAQs
│   ├── transactions.ts   # Wire transfers & transaction history
│   ├── users.ts          # Auth, JWT, user profile & KYC
│   └── withdrawals.ts    # Cardless ATM code generation & claiming
├── services/             # General ledger accounting service
├── utils/                # JWT, Password hashing, Redis, Telemetry, Circuit Breaker
└── index.ts              # Express application entrypoint
```

---

## 📡 REST API Domain Matrix

| Route Module | Endpoint Base | Key Functionality |
| :--- | :--- | :--- |
| **`users.ts`** | `/api/users` | User registration, login, JWT token refresh, profile update, KYC verification. |
| **`accounts.ts`** | `/api/accounts` | Fetch user accounts, balance inquiries, new account allocation. |
| **`transactions.ts`**| `/api/transactions` | Money transfers, double-entry ledger execution, transaction history. |
| **`ledger.ts`** | `/api/ledger` | General ledger integrity verification, debit/credit audit views. |
| **`withdrawals.ts`** | `/api/withdrawals` | Cardless ATM withdrawal code generation & 6-digit PIN claiming. |
| **`cards.ts`** | `/api/cards` | Debit & credit card issuing, freeze/unfreeze, limit changes, PIN reset. |
| **`loans.ts`** | `/api/loans` | Loan application submission, EMI payment schedule tracking, repayment processing. |
| **`analytics.ts`** | `/api/analytics` | Personal spending breakdown, monthly category summaries. |
| **`support.ts`** | `/api/support` | Ticket creation, ticket comments, customer feedback submission, FAQs. |
| **`chat.ts`** | `/api/chat` | AI chatbot integration & staff live chat workspace. |
| **`ml.ts`** | `/api/ml` | Proxy endpoints for AI risk scoring and expense categorization. |
| **`admin-ai.ts`** | `/api/admin` | Admin dashboard analytics, card/loan approval management. |
| **`config.ts`** | `/api/config` | System-wide parameters (interest rates, limits, maintenance mode). |

---

## 🔒 Security & Resilience Architecture

1. **Authentication**: JWT access token + refresh token lifecycle with HTTP-only cookies.
2. **Password Security**: Argon2 / Bcrypt password hashing.
3. **Idempotency Engine**: `Idempotency-Key` HTTP header validation via Redis.
4. **Circuit Breaker**: `utils/circuitBreaker.ts` protects core backend from downstream AI service outages.
5. **OpenTelemetry Tracing**: `utils/telemetry.ts` injects OTLP trace context (`service.criticality`).

---

## 🚀 Running & Testing Locally

```bash
cd backend

# Install dependencies
npm install

# Run database setup scripts (if needed)
npx ts-node check_admin.ts

# Start Express development server (Port 5000)
npm run dev

# Run Vitest test suite
npm test
```
