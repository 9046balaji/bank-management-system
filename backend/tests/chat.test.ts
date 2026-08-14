import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/index';

describe('User Support Chat API', () => {
  describe('POST /api/support/chat', () => {
    it('should handle unauthenticated request with auth requirement error', async () => {
      const res = await request(app)
        .post('/api/support/chat')
        .send({
          message: 'How do I check my balance?',
          history: []
        });

      // Route requires auth, should return 401 unauthenticated
      expect([401, 403]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/support/chat/live (Web Search)', () => {
    it('should require authentication for live support chat', async () => {
      const res = await request(app)
        .post('/api/support/chat/live')
        .send({
          message: 'What are the current RBI repo rates?',
          context: 'Test user'
        });

      expect([401, 403]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
    });
  });
});

describe('Admin AI Chat API', () => {
  describe('POST /api/admin/ai/chat', () => {
    it('should reject unauthorized access without admin token', async () => {
      const res = await request(app)
        .post('/api/admin/ai/chat')
        .send({
          message: 'Show me loan analytics summary',
          context: 'Admin user'
        });

      expect([401, 403]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
    });
  });
});

describe('Live Web Search Chat API', () => {
  describe('POST /api/chat/live', () => {
    it('should reject unauthorized live search request without admin auth', async () => {
      const res = await request(app)
        .post('/api/chat/live')
        .send({
          message: 'Current gold prices in India',
          context: 'Market research'
        });

      expect([401, 403]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
    });
  });
});
