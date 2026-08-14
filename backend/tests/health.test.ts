import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index';

describe('Health & Metrics Endpoint Tests', () => {
  it('GET /health should return 200 OK and status info', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'OK');
    expect(res.body).toHaveProperty('redis_connected');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /metrics should return Prometheus metrics output', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('aurabank_backend_');
  });

  it('GET /api/health/db should respond with database status', async () => {
    const res = await request(app).get('/api/health/db');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
  });
});
