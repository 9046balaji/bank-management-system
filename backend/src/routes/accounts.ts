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

// ==========================================
// DEPOSIT FUNDS
// ==========================================
router.post('/:id/deposit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, description = 'Manual Deposit', source = 'BANK_TRANSFER' } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0',
      });
    }

    // Verify account exists and is active
    const accountCheck = await query(
      'SELECT * FROM accounts WHERE id = $1',
      [id]
    );

    if (accountCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    const account = accountCheck.rows[0];

    if (!account.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Account is inactive',
      });
    }

    // Generate reference ID
    const referenceId = `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Perform atomic deposit using transaction
    await query('BEGIN');

    try {
      // Update balance
      const updatedAccount = await query(
        'UPDATE accounts SET balance = balance + $1 WHERE id = $2 RETURNING *',
        [amount, id]
      );

      // Create transaction record
      await query(
        `INSERT INTO transactions (account_id, type, amount, description, status, reference_id)
         VALUES ($1, 'DEPOSIT', $2, $3, 'COMPLETED', $4)`,
        [id, amount, `${description} (${source})`, referenceId]
      );

      await query('COMMIT');

      res.json({
        success: true,
        message: 'Deposit completed successfully',
        reference_id: referenceId,
        amount: amount,
        previous_balance: parseFloat(account.balance),
        new_balance: parseFloat(updatedAccount.rows[0].balance),
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error processing deposit:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process deposit',
    });
  }
});

// ==========================================
// GET ACCOUNT BY ACCOUNT NUMBER
// ==========================================
router.get('/number/:accountNumber', async (req: Request, res: Response) => {
  try {
    const { accountNumber } = req.params;
    const result = await query(
      `SELECT a.id, a.account_number, a.account_type, a.is_active, u.full_name
       FROM accounts a
       JOIN users u ON a.user_id = u.id
       WHERE a.account_number = $1`,
      [accountNumber]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    // Don't expose balance for security
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

export default router;
