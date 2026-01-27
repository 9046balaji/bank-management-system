import express, { Router, Request, Response } from 'express';
import { query } from '../db/connection';

const router: Router = express.Router();

// Get all accounts
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT a.id, a.user_id, a.account_number, a.account_type, a.balance, a.is_active, 
              a.created_at, u.full_name, u.email
       FROM accounts a
       JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch accounts',
    });
  }
});

// Get account by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT a.*, u.full_name, u.email 
       FROM accounts a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch account',
    });
  }
});

// Get accounts by user ID
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const result = await query(
      'SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching user accounts:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch accounts',
    });
  }
});

// Create new account
router.post('/', async (req: Request, res: Response) => {
  try {
    const { user_id, account_number, account_type, balance = 0 } = req.body;

    if (!user_id || !account_number || !account_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, account_number, account_type',
      });
    }

    const result = await query(
      `INSERT INTO accounts (user_id, account_number, account_type, balance)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, account_number, account_type, balance]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Account created successfully',
    });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create account',
    });
  }
});

// Update account balance
router.patch('/:id/balance', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { balance } = req.body;

    if (balance === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Balance is required',
      });
    }

    const result = await query(
      'UPDATE accounts SET balance = $2 WHERE id = $1 RETURNING *',
      [id, balance]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Balance updated successfully',
    });
  } catch (error) {
    console.error('Error updating balance:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update balance',
    });
  }
});

export default router;
