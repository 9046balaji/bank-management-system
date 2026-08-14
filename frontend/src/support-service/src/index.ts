import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import client from 'prom-client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'support_db',
  user: process.env.DB_USER || 'aurabank',
  password: process.env.DB_PASSWORD || 'local_dev_password',
});

client.collectDefaultMetrics({ prefix: 'support_service_' });

app.use(cors());
app.use(express.json());

// Health Check Endpoints
app.get('/healthz/startup', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', service: 'support-service' });
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
    res.status(200).json({ status: 'ready', database: 'support_db' });
  } catch (err: any) {
    res.status(503).json({ status: 'not ready', reason: err.message });
  }
});

app.get('/metrics', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});

// Ticket Endpoints
app.get('/api/v1/support/tickets', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM tickets ORDER BY created_at DESC');
    res.status(200).json({ success: true, tickets: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/support/tickets', async (req: Request, res: Response) => {
  const { user_id, subject, description, priority, category } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tickets (user_id, subject, description, priority, category)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id || '00000000-0000-0000-0000-000000000001', subject, description, priority || 'medium', category || 'general']
    );
    res.status(201).json({ success: true, ticket: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Support Service running on port ${PORT}`);
});
