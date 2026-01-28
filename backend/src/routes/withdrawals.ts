import express, { Router, Request, Response } from 'express';
import { query } from '../db/connection';
import pool from '../db/connection';
import crypto from 'crypto';
import { createWithdrawalEntry, generateLedgerTransactionId } from '../services/ledgerService';

const router: Router = express.Router();

// ==========================================
// GENERATE ATM CODE FOR CARDLESS WITHDRAWAL
// ==========================================
router.post('/atm-code', async (req: Request, res: Response) => {
  try {
    const { account_id, amount } = req.body;

    // Validate required fields
    if (!account_id || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: account_id, amount',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0',
      });
    }

    // ATM withdrawal limits
    const MIN_WITHDRAWAL = 20;
    const MAX_WITHDRAWAL = 1000;

    if (amount < MIN_WITHDRAWAL) {
      return res.status(400).json({
        success: false,
        error: `Minimum withdrawal amount is $${MIN_WITHDRAWAL}`,
      });
    }

    if (amount > MAX_WITHDRAWAL) {
      return res.status(400).json({
        success: false,
        error: `Maximum withdrawal amount is $${MAX_WITHDRAWAL}`,
      });
    }

    // Verify account exists and has sufficient balance
    const accountResult = await query(
      'SELECT * FROM accounts WHERE id = $1',
      [account_id]
    );

    if (accountResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    const account = accountResult.rows[0];

    if (!account.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Account is inactive',
      });
    }

    if (parseFloat(account.balance) < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        current_balance: account.balance,
        requested_amount: amount,
      });
    }

    // Check if there's an existing active code for this account
    const existingCode = await query(
      `SELECT * FROM atm_codes 
       WHERE account_id = $1 
       AND status = 'ACTIVE' 
       AND expires_at > NOW()`,
      [account_id]
    );

    if (existingCode.rowCount && existingCode.rowCount > 0) {
      // Invalidate the existing code
      await query(
        `UPDATE atm_codes SET status = 'CANCELLED' WHERE id = $1`,
        [existingCode.rows[0].id]
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash the code for storage
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    
    // Set expiration (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Store the ATM code
    const result = await query(
      `INSERT INTO atm_codes (account_id, code_hash, amount, expires_at, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       RETURNING id, amount, expires_at, created_at`,
      [account_id, codeHash, amount, expiresAt]
    );

    res.status(201).json({
      success: true,
      message: 'ATM code generated successfully',
      data: {
        code: code, // Only returned once at generation
        amount: amount,
        expires_at: expiresAt.toISOString(),
        expires_in_seconds: 900, // 15 minutes
        instructions: 'Use this code at any Aura Bank ATM within 15 minutes. Do not share this code.',
      },
    });
  } catch (error) {
    console.error('Error generating ATM code:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate ATM code',
    });
  }
});

// ==========================================
// VALIDATE ATM CODE (Used by ATM system)
// ==========================================
router.post('/validate-code', async (req: Request, res: Response) => {
  try {
    const { code, account_number } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Code is required',
      });
    }

    // Hash the provided code
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    // Find the code
    let queryText = `
      SELECT ac.*, a.account_number, a.balance
      FROM atm_codes ac
      JOIN accounts a ON ac.account_id = a.id
      WHERE ac.code_hash = $1 
      AND ac.status = 'ACTIVE'
    `;
    const params: (string | undefined)[] = [codeHash];

    // If account number provided, verify it matches
    if (account_number) {
      queryText += ' AND a.account_number = $2';
      params.push(account_number);
    }

    const result = await query(queryText, params);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired code',
        valid: false,
      });
    }

    const atmCode = result.rows[0];

    // Check if expired
    if (new Date(atmCode.expires_at) < new Date()) {
      // Mark as expired
      await query(
        `UPDATE atm_codes SET status = 'EXPIRED' WHERE id = $1`,
        [atmCode.id]
      );

      return res.status(400).json({
        success: false,
        error: 'Code has expired',
        valid: false,
      });
    }

    // Check if sufficient balance still exists
    if (parseFloat(atmCode.balance) < parseFloat(atmCode.amount)) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        valid: false,
      });
    }

    res.json({
      success: true,
      valid: true,
      data: {
        amount: atmCode.amount,
        account_number: atmCode.account_number,
        code_id: atmCode.id,
      },
    });
  } catch (error) {
    console.error('Error validating ATM code:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate code',
    });
  }
});

// ==========================================
// COMPLETE WITHDRAWAL (Used by ATM after validation)
// ==========================================
router.post('/complete', async (req: Request, res: Response) => {
  try {
    const { code_id, atm_location = 'Unknown ATM' } = req.body;

    if (!code_id) {
      return res.status(400).json({
        success: false,
        error: 'Code ID is required',
      });
    }

    // Get the ATM code
    const codeResult = await query(
      `SELECT ac.*, a.balance
       FROM atm_codes ac
       JOIN accounts a ON ac.account_id = a.id
       WHERE ac.id = $1 AND ac.status = 'ACTIVE'`,
      [code_id]
    );

    if (codeResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or already used code',
      });
    }

    const atmCode = codeResult.rows[0];

    // Verify not expired
    if (new Date(atmCode.expires_at) < new Date()) {
      await query(
        `UPDATE atm_codes SET status = 'EXPIRED' WHERE id = $1`,
        [code_id]
      );

      return res.status(400).json({
        success: false,
        error: 'Code has expired',
      });
    }

    // Verify sufficient balance
    if (parseFloat(atmCode.balance) < parseFloat(atmCode.amount)) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
      });
    }

    // Use ledger-based withdrawal for financial integrity
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create ledger entries (double-entry accounting)
      const ledgerResult = await createWithdrawalEntry(
        atmCode.account_id,
        parseFloat(atmCode.amount),
        `Cardless ATM Withdrawal at ${atm_location}`,
        client
      );

      // Create transaction record for history
      await client.query(
        `INSERT INTO transactions (account_id, type, amount, description, status, reference_id)
         VALUES ($1, 'WITHDRAWAL', $2, $3, 'COMPLETED', $4)`,
        [atmCode.account_id, atmCode.amount, `Cardless ATM Withdrawal at ${atm_location}`, ledgerResult.transactionId]
      );

      // Mark ATM code as used
      await client.query(
        `UPDATE atm_codes SET status = 'USED', used_at = NOW() WHERE id = $1`,
        [code_id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Withdrawal completed successfully',
        reference_id: ledgerResult.transactionId,
        ledger_verified: true,
        amount: atmCode.amount,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error completing withdrawal:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete withdrawal',
    });
  }
});

// ==========================================
// GET PENDING WITHDRAWAL CODES FOR ACCOUNT
// ==========================================
router.get('/pending/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;

    const result = await query(
      `SELECT id, amount, expires_at, created_at, status
       FROM atm_codes
       WHERE account_id = $1 
       AND status = 'ACTIVE'
       AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [accountId]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching pending withdrawals:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pending withdrawals',
    });
  }
});

// ==========================================
// CANCEL ATM CODE
// ==========================================
router.delete('/atm-code/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE atm_codes SET status = 'CANCELLED' 
       WHERE id = $1 AND status = 'ACTIVE'
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Active ATM code not found',
      });
    }

    res.json({
      success: true,
      message: 'ATM code cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling ATM code:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel ATM code',
    });
  }
});

export default router;
