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
  database: process.env.DB_NAME || 'cards_db',
  user: process.env.DB_USER || 'aurabank',
  password: process.env.DB_PASSWORD || 'local_dev_password',
});

client.collectDefaultMetrics({ prefix: 'card_service_' });

app.use(cors());
app.use(express.json());

// Health Probes
app.get('/healthz/startup', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', service: 'card-service' });
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
    res.status(200).json({ status: 'ready', database: 'cards_db' });
  } catch (err: any) {
    res.status(503).json({ status: 'not ready', reason: err.message });
  }
});

app.get('/metrics', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});

// Card Operations API
app.get('/api/v1/cards', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM cards ORDER BY created_at DESC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/v1/cards/:id/freeze', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "UPDATE cards SET status = 'frozen', updated_at = NOW() WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Card not found' });
    res.status(200).json({ success: true, card: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Card Management Service running on port ${PORT}`);
});
