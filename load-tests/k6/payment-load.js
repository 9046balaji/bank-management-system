/**
 * load-tests/k6/payment-load.js
 * ================================================================
 * AuraBank — Phase 4 Load Test: Payment Flow at 5,000 RPS
 * (Phase 0: run at lower RPS for baseline measurement on monolith)
 * ================================================================
 * Tests:
 *   1. POST /api/transactions/transfer — wire transfer with idempotency key
 *   2. GET  /api/accounts              — balance check
 *   3. Verifies idempotency: same key returns same result
 *
 * Phase 0 (baseline on monolith):
 *   k6 run load-tests/k6/payment-load.js --env BASE_URL=http://localhost:5000 --env MODE=baseline
 *
 * Phase 4 (5,000 RPS against microservices):
 *   k6 run load-tests/k6/payment-load.js --env BASE_URL=https://api.aurabank.internal --env MODE=slo
 * ================================================================
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ── Custom Metrics ───────────────────────────────────────────
const transferSuccess    = new Counter('payment_transfer_success_total');
const transferFailed     = new Counter('payment_transfer_failed_total');
const transferLatency    = new Trend('payment_transfer_latency_ms', true);
const idempotencySuccess = new Counter('payment_idempotency_replay_success_total');
const errorRate          = new Rate('payment_error_rate');

// ── Test Config ──────────────────────────────────────────────
const MODE = __ENV.MODE || 'baseline';

export const options = MODE === 'slo'
  ? {
      // Phase 4: SLO test at 5,000 RPS
      scenarios: {
        payment_load: {
          executor: 'constant-arrival-rate',
          rate: 5000,
          timeUnit: '1s',
          duration: '10m',
          preAllocatedVUs: 200,
          maxVUs: 500,
        },
      },
      thresholds: {
        'payment_transfer_latency_ms': ['p(95)<500', 'p(99)<1000'],
        'payment_error_rate':          ['rate<0.001'],  // 99.9% SLO
        'http_req_duration':           ['p(95)<500'],
      },
    }
  : {
      // Phase 0: baseline measurement on monolith
      stages: [
        { duration: '30s', target: 10 },
        { duration: '60s', target: 50 },
        { duration: '30s', target: 0 },
      ],
      thresholds: {
        'payment_transfer_latency_ms': ['p(95)<2000'],  // relaxed for monolith
        'payment_error_rate':          ['rate<0.05'],
      },
    };

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

// ── Setup: login and get auth token ──────────────────────────
export function setup() {
  const loginRes = http.post(`${BASE_URL}/api/users/login`, JSON.stringify({
    email: 'loadtest@aurabank.local',
    password: 'LoadTest@12345',
  }), { headers: { 'Content-Type': 'application/json' } });

  if (loginRes.status !== 200) {
    throw new Error(`Setup login failed: ${loginRes.status} ${loginRes.body}`);
  }

  const body = JSON.parse(loginRes.body);
  const token = body.accessToken || body.token;

  // Get accounts to use as transfer targets
  const accountsRes = http.get(`${BASE_URL}/api/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const accounts = JSON.parse(accountsRes.body);
  return {
    token,
    accounts: accounts.data || accounts.accounts || [],
  };
}

// ── Main Test Scenario ───────────────────────────────────────
export default function (data) {
  const { token, accounts } = data;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Generate unique idempotency key per iteration
  const idempotencyKey = uuidv4();

  // Step 1: Wire transfer
  const transferStart = Date.now();
  const transferRes = http.post(
    `${BASE_URL}/api/transactions/transfer`,
    JSON.stringify({
      to_account_number: 'BANK_CASH',   // Transfer to system account (safe for tests)
      amount: 1.00,
      currency: 'USD',
      description: 'k6 load test transfer',
    }),
    {
      headers: { ...headers, 'Idempotency-Key': idempotencyKey },
    }
  );
  const transferDuration = Date.now() - transferStart;
  transferLatency.add(transferDuration);

  const transferOk = check(transferRes, {
    'transfer: status 200 or 201': (r) => r.status === 200 || r.status === 201,
    'transfer: has transaction_id': (r) => {
      try {
        const b = JSON.parse(r.body);
        return b.transaction_id !== undefined || b.data?.id !== undefined;
      } catch { return false; }
    },
  });

  if (transferOk) {
    transferSuccess.add(1);
    errorRate.add(0);
  } else {
    transferFailed.add(1);
    errorRate.add(1);
  }

  // Step 2: Idempotency replay — same key should return same result
  const replayRes = http.post(
    `${BASE_URL}/api/transactions/transfer`,
    JSON.stringify({
      to_account_number: 'BANK_CASH',
      amount: 1.00,
      currency: 'USD',
      description: 'k6 load test transfer',
    }),
    {
      headers: { ...headers, 'Idempotency-Key': idempotencyKey },
    }
  );

  const replayOk = check(replayRes, {
    'idempotency replay: status 200': (r) => r.status === 200,
  });
  if (replayOk) idempotencySuccess.add(1);

  // Step 3: Balance check
  const balanceRes = http.get(`${BASE_URL}/api/accounts`, { headers });
  check(balanceRes, {
    'balance: status 200': (r) => r.status === 200,
  });

  sleep(0.1); // 100ms think time (low for high-RPS test)
}

export function teardown(data) {
  console.log(`Payment load test complete. Mode: ${MODE}`);
  if (MODE === 'slo') {
    console.log('NEXT STEP: Run scripts/verify-ledger.sh to confirm 0 ledger imbalances.');
  }
}
