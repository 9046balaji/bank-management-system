# PowerShell Script to commit every modified file separately with professional multi-line messages

Write-Host "🚀 Starting individual file commits..." -ForegroundColor Cyan

# 1. backend/src/utils/jwt.ts
git add backend/src/utils/jwt.ts
git commit -m "security(jwt): enforce environment-based secrets and remove hardcoded fallbacks" -m "Remove hardcoded fallback secrets for access and refresh tokens.`nAdd explicit startup check that halts backend initialization if JWT_SECRET or JWT_REFRESH_SECRET is missing."

# 2. backend/src/middleware/rateLimiter.ts
git add backend/src/middleware/rateLimiter.ts
git commit -m "security(rate-limit): restore production rate limiting thresholds" -m "Reconfigure max request thresholds for auth, registration, transactions, and API endpoints back to production-grade limits.`nPrevent brute-force authentication and request flooding attacks across sensitive routes."

# 3. backend/src/index.ts
git add backend/src/index.ts
git commit -m "security(core): re-enable global rate limiting and secure metrics endpoints" -m "Re-enable global rate limiter middleware as a baseline safety net across all HTTP endpoints.`nRestrict access to Prometheus metrics (/metrics) and database health (/api/health/db) endpoints to authenticated admins only."

# 4. backend/src/routes/users.ts
git add backend/src/routes/users.ts
git commit -m "security(users): enforce RBAC, ownership checks, and cryptographically secure PRNG" -m "Add admin-only authorization to user listing, deletion, and email lookup endpoints.`nEnforce resource-ownership checks on profile updates, KYC completion, and notification settings.`nRe-enable auth rate limiting and account lockout middleware on login.`nReplace Math.random() with crypto.randomInt() for secure account number and card last-4 generation."

# 5. backend/src/routes/accounts.ts
git add backend/src/routes/accounts.ts
git commit -m "security(accounts): restrict balance updates, add ownership checks, and ensure atomic deposits" -m "Restrict direct balance modification endpoint to administrator role only.`nAdd account-ownership verification checks for fetching and depositing into accounts.`nRefactor deposit transactions to use dedicated client connections (pool.connect()) for true database atomicity."

# 6. backend/src/routes/transactions.ts
git add backend/src/routes/transactions.ts
git commit -m "security(transactions): enforce mandatory PIN verification and sender account ownership" -m "Make 4-digit PIN mandatory for all fund transfers and verify sender account ownership against authenticated user ID.`nRemove fallback test PIN logic and eliminate credential disclosures in error responses."

# 7. backend/src/routes/cards.ts
git add backend/src/routes/cards.ts
git commit -m "security(cards): restrict card management to admins and use secure random PIN generation" -m "Add admin-only access control to card listing and card application review endpoints.`nEnforce account-ownership checks on user-specific card queries and card application creation.`nUpgrade card number masking to use cryptographically secure random integers via crypto.randomInt()."

# 8. backend/src/routes/loans.ts
git add backend/src/routes/loans.ts
git commit -m "security(loans): enforce role-based access control, account ownership, and atomic EMI transactions" -m "Restrict loan listing, creation, status modification, and application review to administrators.`nEnforce user ownership checks on loan queries and source accounts used for EMI payments.`nRefactor EMI payment processing to use isolated pool.connect() transactions with proper rollback handling.`nFix loan payoff status mapping to align with the database enum ('REPAID')."

# 9. backend/src/routes/withdrawals.ts
git add backend/src/routes/withdrawals.ts
git commit -m "security(withdrawals): use cryptographically secure PRNG for ATM code generation" -m "Replace predictable Math.random() logic with crypto.randomInt() for generating 6-digit cardless ATM withdrawal codes.`nPrevents code prediction and brute-force guessing attacks."

Write-Host "✅ All modified files have been committed separately!" -ForegroundColor Green
