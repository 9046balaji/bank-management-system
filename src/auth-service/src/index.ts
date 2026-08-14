import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import pg from 'pg';
import client from 'prom-client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// PostgreSQL pool targeting user_db
const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'user_db',
  user: process.env.DB_USER || 'aurabank',
  password: process.env.DB_PASSWORD || 'local_dev_password',
  max: 20,
  idleTimeoutMillis: 30000,
});

// Prometheus metrics
client.collectDefaultMetrics({ prefix: 'auth_service_' });

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Standard Health Check Endpoints
app.get('/healthz/startup', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', component: 'auth-service' });
  } catch (err: any) {
    res.status(503).json({ status: 'starting', reason: err.message });
  }
});

app.get('/healthz/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'live' });
});

app.get('/healthz/ready', async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    client.release();
    res.status(200).json({ status: 'ready', database: 'user_db' });
  } catch (err: any) {
    res.status(503).json({ status: 'not ready', reason: err.message });
  }
});

app.get('/metrics', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});

// Auth Routes (Login, Register, Profile, KYC)
app.post('/api/v1/auth/register', async (req: Request, res: Response) => {
  const { email, password, full_name, phone } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Missing required fields: email, password, full_name' });
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role, kyc_status, created_at`,
      [email, password, full_name, phone || null]
    );
    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    res.status(200).json({
      success: true,
      token: 'mock_jwt_access_token',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        kyc_status: user.kyc_status,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Auth & User Service running on port ${PORT}`);
});
