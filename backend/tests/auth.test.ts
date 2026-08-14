import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index';

describe('User Authentication API Tests', () => {
  describe('POST /api/users/register', () => {
    it('should validate missing required fields on registration', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({
          email: 'invalid-email',
          password: '123'
        });

      expect([400, 422]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/users/login', () => {
    it('should return error for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'nonexistent_test_user_999@aurabank.com',
          password: 'WrongPassword123!'
        });

      expect([400, 401, 404, 500]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject login request with missing password', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'admin@aurabank.com'
        });

      expect([400, 401]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
    });
  });
});
