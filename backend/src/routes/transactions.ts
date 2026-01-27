import express, { Router, Request, Response } from 'express';
import { query } from '../db/connection';

const router: Router = express.Router();

// Get all transactions
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT t.*, a.account_number 
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       ORDER BY t.transaction_date DESC
       LIMIT 100`
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transactions',
    });
  }
});

// Get transaction by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM transactions WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transaction',
    });
  }
});

// Get transactions by account ID
router.get('/account/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const result = await query(
      `SELECT * FROM transactions 
       WHERE account_id = $1
       ORDER BY transaction_date DESC
       LIMIT $2`,
      [accountId, limit]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching account transactions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transactions',
    });
  }
});

// Create new transaction
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      account_id,
      type,
      amount,
      description,
      counterparty_name = null,
      counterparty_account_number = null,
      status = 'COMPLETED',
      reference_id = null,
    } = req.body;

    if (!account_id || !type || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: account_id, type, amount',
      });
    }

    const result = await query(
      `INSERT INTO transactions (account_id, type, amount, description, counterparty_name, counterparty_account_number, status, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        account_id,
        type,
        amount,
        description || null,
        counterparty_name,
        counterparty_account_number,
        status,
        reference_id,
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Transaction created successfully',
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create transaction',
    });
  }
});

// Update transaction status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }

    const result = await query(
      'UPDATE transactions SET status = $2 WHERE id = $1 RETURNING *',
      [id, status]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Transaction status updated',
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update transaction',
    });
  }
});

export default router;
