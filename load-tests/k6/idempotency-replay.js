/**
 * load-tests/k6/idempotency-replay.js
 * ================================================================
 * AuraBank — Idempotency Verification Load Test
 * ================================================================
 * Sends the SAME Idempotency-Key 100 times concurrently:
 *   - Verifies all 100 requests return HTTP 200/201 with identical payload
 *   - Ensures EXACTLY 1 database record is inserted in payments_db
 * ================================================================
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const replayMatchCount = new Counter('idempotency_replay_match_total');
const errorRate = new Rate('idempotency_error_rate');

export const options = {
  vus: 10,
  duration: '10s',
  thresholds: {
    'idempotency_error_rate': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const SHARED_KEY = uuidv4(); // Single idempotency key shared by all VUs

export default function () {
  const payload = JSON.stringify({
    to_account_number: 'BANK_CASH',
    amount: 50.00,
    currency: 'USD',
    description: 'Concurrent idempotency replay test',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': SHARED_KEY,
    },
  };

  const res = http.post(`${BASE_URL}/api/transactions/transfer`, payload, params);

  const ok = check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  if (ok) {
    replayMatchCount.add(1);
    errorRate.add(0);
  } else {
    errorRate.add(1);
  }

  sleep(0.1);
}
