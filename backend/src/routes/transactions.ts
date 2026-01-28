import express, { Router, Request, Response } from 'express';
import { query } from '../db/connection';
import pool from '../db/connection';
import { idempotencyMiddleware, checkTransactionIdempotency, generateReferenceId } from '../utils/idempotency';
import { callMLService } from '../utils/circuitBreaker';
import { 
  createTransferEntries, 
  verifyLedgerBalance, 
  verifyTransactionBalance,
  getAccountLedgerEntries,
  getLedgerSummary,
  generateLedgerTransactionId
} from '../services/ledgerService';

const router: Router = express.Router();

// Fallback keyword-based categorization
function fallbackCategorization(description: string): { category: string; confidence: number } {
  const lowerDesc = description.toLowerCase();
  const categoryKeywords: Record<string, string[]> = {
    'Food & Dining': ['swiggy', 'zomato', 'restaurant', 'cafe', 'food', 'pizza', 'coffee', 'mcdonald'],
    'Transportation': ['uber', 'ola', 'metro', 'petrol', 'fuel', 'cab', 'taxi', 'parking'],
    'Shopping': ['amazon', 'flipkart', 'myntra', 'shopping', 'store', 'purchase'],
    'Bills & Utilities': ['electricity', 'water bill', 'internet', 'rent', 'mobile recharge'],
    'Entertainment': ['netflix', 'spotify', 'movie', 'hotstar', 'game'],
    'Healthcare': ['hospital', 'doctor', 'pharmacy', 'medicine', 'medical'],
    'Education': ['course', 'tuition', 'school', 'college', 'udemy'],
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lowerDesc.includes(kw))) {
      return { category, confidence: 80 };
    }
  }
  
  return { category: 'Others', confidence: 50 };
}

// Helper function to categorize expense using ML API with circuit breaker
async function categorizeExpense(description: string): Promise<{ category: string; confidence: number }> {
  return callMLService<{ category: string; confidence: number }>(
    '/categorize_expense',
    { description },
    () => fallbackCategorization(description)
  );
}

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
      category: providedCategory = null,
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

    // Auto-categorize expense using ML if description exists and no category provided
    let category = providedCategory || 'Others';
    let categoryConfidence = 0;
    
    if (description && !providedCategory) {
      try {
        const catResult = await categorizeExpense(description);
        category = catResult.category;
        categoryConfidence = catResult.confidence;
        console.log(`ML Categorized "${description}" -> ${category} (${categoryConfidence}% confidence)`);
      } catch (catError) {
        console.log('Category detection failed, using Others');
      }
    }

    const result = await query(
      `INSERT INTO transactions (account_id, type, amount, description, category, category_confidence, counterparty_name, counterparty_account_number, status, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        account_id,
        type,
        amount,
        description || null,
        category,
        categoryConfidence,
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
      category_detected: category,
      category_confidence: categoryConfidence,
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

// ==========================================
// TRANSFER BETWEEN ACCOUNTS (with idempotency support)
// ==========================================
router.post('/transfer', idempotencyMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      from_account_id,
      to_account_number,
      amount,
      description = 'Transfer',
      pin,
      idempotency_key,
    } = req.body;

    // Validate required fields
    if (!from_account_id || !to_account_number || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: from_account_id, to_account_number, amount',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0',
      });
    }

    // Generate reference ID with idempotency key if provided
    const referenceId = idempotency_key 
      ? `TXN-${idempotency_key}` 
      : generateReferenceId();

    // Check if transaction already exists (database-level idempotency)
    const existingTx = await checkTransactionIdempotency(referenceId);
    if (existingTx.exists) {
      return res.json({
        success: true,
        message: 'Transfer already completed (idempotent)',
        reference_id: referenceId,
        _idempotent: true,
        transaction: existingTx.transaction,
      });
    }

    // Get sender account
    const senderResult = await query(
      `SELECT a.*, c.pin_hash, c.id as card_id, c.daily_limit, c.status as card_status
       FROM accounts a
       LEFT JOIN cards c ON c.account_id = a.id
       WHERE a.id = $1`,
      [from_account_id]
    );

    if (senderResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Sender account not found',
      });
    }

    const sender = senderResult.rows[0];

    // Check if sender has sufficient balance
    if (parseFloat(sender.balance) < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        current_balance: sender.balance,
        requested_amount: amount,
      });
    }

    // Verify PIN if provided and card exists
    if (pin && sender.pin_hash) {
      const crypto = require('crypto');
      const pinHash = crypto.createHash('sha256').update(pin).digest('hex');
      if (pinHash !== sender.pin_hash) {
        return res.status(401).json({
          success: false,
          error: 'Invalid PIN',
        });
      }
    }

    // Check card status if exists
    if (sender.card_status === 'FROZEN' || sender.card_status === 'BLOCKED') {
      return res.status(400).json({
        success: false,
        error: `Transfer blocked: Card is ${sender.card_status.toLowerCase()}`,
      });
    }

    // Check daily limit if card exists
    if (sender.daily_limit && amount > parseFloat(sender.daily_limit)) {
      return res.status(400).json({
        success: false,
        error: `Amount exceeds daily limit of $${sender.daily_limit}`,
      });
    }

    // Get recipient account
    const recipientResult = await query(
      'SELECT * FROM accounts WHERE account_number = $1',
      [to_account_number]
    );

    if (recipientResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recipient account not found',
      });
    }

    const recipient = recipientResult.rows[0];

    // Prevent self-transfer
    if (sender.id === recipient.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot transfer to the same account',
      });
    }

    // Use ledger-based transfer for financial integrity
    // This creates proper double-entry bookkeeping records
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create ledger entries (double-entry accounting)
      const ledgerResult = await createTransferEntries(
        from_account_id,
        recipient.id,
        amount,
        description,
        client
      );

      // Verify the ledger transaction balances (debits = credits)
      if (!ledgerResult.verified) {
        throw new Error('Ledger integrity check failed');
      }

      // Create debit transaction for sender (for transaction history)
      await client.query(
        `INSERT INTO transactions (account_id, type, amount, description, counterparty_name, counterparty_account_number, status, reference_id)
         VALUES ($1, 'TRANSFER', $2, $3, $4, $5, 'COMPLETED', $6)`,
        [from_account_id, amount, description, null, to_account_number, ledgerResult.transactionId]
      );

      // Create credit transaction for recipient (for transaction history)
      await client.query(
        `INSERT INTO transactions (account_id, type, amount, description, counterparty_name, counterparty_account_number, status, reference_id)
         VALUES ($1, 'DEPOSIT', $2, $3, $4, $5, 'COMPLETED', $6)`,
        [recipient.id, amount, `Transfer from ${sender.account_number}`, null, sender.account_number, ledgerResult.transactionId]
      );

      await client.query('COMMIT');

      // Get updated sender balance
      const updatedSender = await query(
        'SELECT balance FROM accounts WHERE id = $1',
        [from_account_id]
      );

      res.json({
        success: true,
        message: 'Transfer completed successfully',
        reference_id: ledgerResult.transactionId,
        ledger_verified: true,
        amount: amount,
        new_balance: updatedSender.rows[0].balance,
        recipient_account: to_account_number,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error processing transfer:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Transfer failed',
    });
  }
});

export default router;
