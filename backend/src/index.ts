import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { query } from './db/connection';
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware
app.use(requestLogger);

// Global rate limiter - safety net for all requests
app.use(globalRateLimiter);

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

// Database health check
app.get('/api/health/db', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT NOW()');
    res.json({
      status: 'OK',
      database: 'Connected',
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'Connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
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

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
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

export default app;
