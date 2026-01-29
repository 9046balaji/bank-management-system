import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { query, runMigrations, checkDatabaseHealth } from './db/connection';
import userRoutes from './routes/users';
import accountRoutes from './routes/accounts';
import transactionRoutes from './routes/transactions';
import loanRoutes from './routes/loans';
import cardRoutes from './routes/cards';
import withdrawalRoutes from './routes/withdrawals';
import supportRoutes from './routes/support';
import analyticsRoutes from './routes/analytics';
import configRoutes from './routes/config';
import mlRoutes from './routes/ml';
import ledgerRoutes from './routes/ledger';
import adminAiRoutes from './routes/admin-ai';
import chatRoutes from './routes/chat';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/errorMiddleware';
import { authMiddleware, adminMiddleware } from './middleware/authMiddleware';
import { getAllCircuitBreakerStats } from './utils/circuitBreaker';
import {
  globalRateLimiter,
  standardRateLimiter,
  transactionRateLimiter,
  mlRateLimiter
} from './middleware/rateLimiter';

dotenv.config({ path: '.env.local' });

const app: Express = express();
const PORT = process.env.SERVER_PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Request body size limits for security
app.use(express.json({
  limit: '10kb',  // Limit JSON body size to prevent DoS
  strict: true    // Only accept arrays and objects
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10kb'
}));
app.use(cookieParser());

// Request logging middleware
app.use(requestLogger);

// Global rate limiter - safety net for all requests
// app.use(globalRateLimiter);

// Security headers
app.use((req: Request, res: Response, next: NextFunction) => {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Strict Transport Security (HTTPS only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database health check with detailed stats
app.get('/api/health/db', async (req: Request, res: Response) => {
  const health = await checkDatabaseHealth();
  const statusCode = health.status === 'healthy' ? 200 :
    health.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Circuit breaker status (admin only)
app.get('/api/health/circuit-breakers', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: getAllCircuitBreakerStats(),
  });
});

// ==========================================
// PUBLIC API Routes (no auth required)
// ==========================================
app.use('/api/users', userRoutes); // Login/register are public, other routes are protected internally

// ==========================================
// DEVELOPMENT ONLY - Seed Data Endpoints
// ==========================================
if (process.env.NODE_ENV !== 'production') {
  // Seed feedback data (for testing)
  app.post('/api/dev/seed-feedback', async (req: Request, res: Response) => {
    try {
      const { user_id, entries } = req.body;

      if (!entries || !Array.isArray(entries)) {
        return res.status(400).json({ error: 'entries array is required' });
      }

      // Get first user if not provided
      let userId = user_id;
      if (!userId) {
        const userResult = await query("SELECT id FROM users WHERE role = 'USER' LIMIT 1");
        userId = userResult.rows[0]?.id;
      }

      const results = [];
      for (const entry of entries) {
        try {
          const result = await query(
            `INSERT INTO feedback (user_id, type, category, subject, description, rating, status, is_public, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             RETURNING id, subject`,
            [
              userId,
              entry.type || 'OTHER',
              entry.category || 'APP',
              entry.subject,
              entry.description,
              entry.rating || 3,
              entry.status || 'NEW',
              entry.is_public || false
            ]
          );
          results.push({ success: true, id: result.rows[0].id, subject: result.rows[0].subject });
        } catch (err: any) {
          results.push({ success: false, subject: entry.subject, error: err.message });
        }
      }

      res.json({
        success: true,
        message: `Seeded ${results.filter(r => r.success).length}/${entries.length} feedback entries`,
        results
      });
    } catch (error) {
      console.error('Seed error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Seed failed' });
    }
  });

  console.log('DEV endpoints enabled: /api/dev/seed-feedback');
}

// ==========================================
// PROTECTED API Routes (auth required)
// ==========================================
app.use('/api/accounts', authMiddleware, standardRateLimiter, accountRoutes);
app.use('/api/transactions', authMiddleware, transactionRateLimiter, transactionRoutes);
app.use('/api/loans', authMiddleware, standardRateLimiter, loanRoutes);
app.use('/api/cards', authMiddleware, standardRateLimiter, cardRoutes);
app.use('/api/withdrawals', authMiddleware, transactionRateLimiter, withdrawalRoutes);
app.use('/api/support', authMiddleware, standardRateLimiter, supportRoutes);
app.use('/api/analytics', authMiddleware, standardRateLimiter, analyticsRoutes);
app.use('/api/ml', authMiddleware, mlRateLimiter, mlRoutes);

// ==========================================
// ADMIN API Routes
// ==========================================
app.use('/api/config', authMiddleware, adminMiddleware, configRoutes);
app.use('/api/ledger', authMiddleware, adminMiddleware, ledgerRoutes); // Ledger audit - admin only
app.use('/api/admin/ai', authMiddleware, adminMiddleware, adminAiRoutes); // Admin AI & Feedback - admin only
app.use('/api/chat', authMiddleware, adminMiddleware, chatRoutes); // Live web search chat - admin only

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  // Run database migrations first
  await runMigrations();

  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║     Aura Bank Backend Server           ║
║     ================================    ║
║     Server: http://localhost:${PORT}     ║
║     Env: ${process.env.NODE_ENV || 'development'}                    ║
║     Database: PostgreSQL               ║
╚════════════════════════════════════════╝
    `);
  });
};

startServer();

export default app;
