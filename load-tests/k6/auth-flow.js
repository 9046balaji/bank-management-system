/**
 * load-tests/k6/auth-flow.js
 * ================================================================
 * AuraBank — Phase 0 Baseline: Auth Flow Load Test
 * ================================================================
 * Tests the auth service under realistic load:
 *   1. Register new user (first run only — uses unique email)
 *   2. Login → receive JWT
 *   3. Fetch profile (authenticated request)
 *
 * Run:
 *   k6 run load-tests/k6/auth-flow.js
 *   k6 run --vus 50 --duration 60s load-tests/k6/auth-flow.js
 *
 * Baseline targets (monolith before migration):
 *   - p95 login latency < 500ms
 *   - error rate < 1%
 * ================================================================
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ── Custom Metrics ───────────────────────────────────────────
const loginSuccess  = new Counter('auth_login_success_total');
const loginFailed   = new Counter('auth_login_failed_total');
const loginLatency  = new Trend('auth_login_latency_ms', true);
const errorRate     = new Rate('auth_error_rate');

// ── Test Config ──────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 VUs
    { duration: '60s', target: 50 },   // Hold at 50 VUs
    { duration: '30s', target: 100 },  // Peak load
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    // SLO: p95 login latency < 500ms
    'auth_login_latency_ms': ['p(95)<500'],
    // SLO: error rate < 1%
    'auth_error_rate': ['rate<0.01'],
    // Standard http_req_duration for all requests
    'http_req_duration': ['p(95)<600'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

// Pre-seeded test user (create this user before running the test)
const TEST_USER = {
  email: 'loadtest@aurabank.local',
  password: 'LoadTest@12345',
};

// ── Setup: ensure test user exists ──────────────────────────
export function setup() {
  const registerRes = http.post(`${BASE_URL}/api/users/register`, JSON.stringify({
    email: TEST_USER.email,
    password: TEST_USER.password,
    full_name: 'Load Test User',
    phone: '+1-555-0100',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  // 201 = created, 409 = already exists (both OK for setup)
  if (registerRes.status !== 201 && registerRes.status !== 409) {
    console.error(`Setup: unexpected register status ${registerRes.status}: ${registerRes.body}`);
  }

  // Login to get initial token
  const loginRes = http.post(`${BASE_URL}/api/users/login`, JSON.stringify({
    email: TEST_USER.email,
    password: TEST_USER.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const body = JSON.parse(loginRes.body);
  return { token: body.accessToken || body.token || '' };
}

// ── Main Test Scenario ───────────────────────────────────────
export default function (data) {
  const headers = { 'Content-Type': 'application/json' };
  const authHeaders = { ...headers, Authorization: `Bearer ${data.token}` };

  // Step 1: Login (main SLO measurement)
  const loginStart = Date.now();
  const loginRes = http.post(
    `${BASE_URL}/api/users/login`,
    JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
    { headers }
  );
  const loginDuration = Date.now() - loginStart;
  loginLatency.add(loginDuration);

  const loginOk = check(loginRes, {
    'login: status 200': (r) => r.status === 200,
    'login: has token':  (r) => JSON.parse(r.body).accessToken !== undefined
                               || JSON.parse(r.body).token !== undefined,
  });

  if (loginOk) {
    loginSuccess.add(1);
    errorRate.add(0);
    const token = JSON.parse(loginRes.body).accessToken || JSON.parse(loginRes.body).token;

    // Step 2: Fetch profile (authenticated)
    const profileRes = http.get(`${BASE_URL}/api/users/profile`, {
      headers: { ...headers, Authorization: `Bearer ${token}` },
    });

    check(profileRes, {
      'profile: status 200': (r) => r.status === 200,
    });
  } else {
    loginFailed.add(1);
    errorRate.add(1);
    console.warn(`Login failed: status=${loginRes.status} body=${loginRes.body}`);
  }

  sleep(0.5); // Think time between iterations
}

// ── Teardown: print summary ───────────────────────────────────
export function teardown(data) {
  console.log('Auth flow baseline test complete.');
  console.log(`Baseline result: check Grafana for p95 latency and error rate.`);
}
