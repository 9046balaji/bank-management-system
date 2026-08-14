import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index';

describe('AI/ML Gateway Proxy API Tests', () => {
  describe('POST /api/ml/fraud/predict', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/ml/fraud/predict')
        .send({
          Amount: 4500,
          is_foreign: false
        });

      expect([401, 403]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/ml/loan/predict', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/ml/loan/predict')
        .send({
          ApplicantIncome: 5000,
          LoanAmount: 2000
        });

      expect([401, 403]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/ml/expense/categorize', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/ml/expense/categorize')
        .send({
          description: 'Swiggy food delivery'
        });

      expect([401, 403]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
    });
  });
});
