/**
 * Ledger Audit Routes
 * 
 * Endpoints for verifying financial integrity of the double-entry ledger system.
 * These should be used by auditors and administrators to verify that all 
 * debits equal credits across the entire system.
 */

import express, { Router, Request, Response } from 'express';
import { 
  verifyLedgerBalance, 
  verifyTransactionBalance,
  getAccountLedgerEntries,
  getTransactionEntries,
  getLedgerSummary,
  createReversalEntry
} from '../services/ledgerService';
import { query } from '../db/connection';

const router: Router = express.Router();

/**
 * GET /api/ledger/verify
 * Verify that the entire ledger is balanced (debits = credits)
 * This is the key audit endpoint to ensure financial integrity
 */
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const verification = await verifyLedgerBalance();

    if (!verification.isBalanced) {
      // This is a critical error - ledger is out of balance!
      console.error('CRITICAL: Ledger is out of balance!', verification);
      return res.status(500).json({
        success: false,
        error: 'Ledger integrity violation detected',
        verification,
        alert: 'CRITICAL: Immediate investigation required',
      });
    }

    res.json({
      success: true,
      message: 'Ledger is balanced - financial integrity verified',
      verification,
    });
  } catch (error) {
    console.error('Error verifying ledger:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify ledger',
    });
  }
});

/**
 * GET /api/ledger/verify/:transactionId
 * Verify that a specific transaction is balanced
 */
router.get('/verify/:transactionId', async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const verification = await verifyTransactionBalance(transactionId);

    if (!verification.isBalanced) {
      return res.status(400).json({
        success: false,
        error: 'Transaction is not balanced',
        verification,
      });
    }

    res.json({
      success: true,
      message: 'Transaction is balanced',
      verification,
    });
  } catch (error) {
    console.error('Error verifying transaction:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify transaction',
    });
  }
});

/**
 * GET /api/ledger/summary
 * Get a summary of the ledger for audit purposes
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summary = await getLedgerSummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching ledger summary:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch ledger summary',
    });
  }
});

/**
 * GET /api/ledger/account/:accountId
 * Get ledger entries for a specific account
 */
router.get('/account/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const entries = await getAccountLedgerEntries(
      parseInt(accountId),
      limit,
      offset
    );

    // Calculate running totals
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of entries) {
      if (entry.entry_type === 'DEBIT') {
        totalDebits += parseFloat(entry.amount.toString());
      } else {
        totalCredits += parseFloat(entry.amount.toString());
      }
    }

    res.json({
      success: true,
      data: entries,
      summary: {
        totalDebits,
        totalCredits,
        netBalance: totalDebits - totalCredits,
      },
      pagination: {
        limit,
        offset,
        count: entries.length,
      },
    });
  } catch (error) {
    console.error('Error fetching account ledger:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch account ledger',
    });
  }
});

/**
 * GET /api/ledger/transaction/:transactionId
 * Get all entries for a specific transaction
 */
router.get('/transaction/:transactionId', async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const entries = await getTransactionEntries(transactionId);

    if (entries.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    // Verify the transaction is balanced
    const verification = await verifyTransactionBalance(transactionId);

    res.json({
      success: true,
      data: entries,
      isBalanced: verification.isBalanced,
      totals: {
        debits: verification.totalDebits,
        credits: verification.totalCredits,
      },
    });
  } catch (error) {
    console.error('Error fetching transaction entries:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transaction entries',
    });
  }
});

/**
 * POST /api/ledger/reversal
 * Create a reversal entry for a previous transaction
 * This is used to undo incorrect transactions without deleting records
 */
router.post('/reversal', async (req: Request, res: Response) => {
  try {
    const { transaction_id, reason } = req.body;

    if (!transaction_id || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: transaction_id, reason',
      });
    }

    const reversalResult = await createReversalEntry(transaction_id, reason);

    res.json({
      success: true,
      message: 'Reversal completed successfully',
      data: {
        reversalTransactionId: reversalResult.transactionId,
        originalTransactionId: transaction_id,
        entries: reversalResult.entries,
        verified: reversalResult.verified,
      },
    });
  } catch (error) {
    console.error('Error creating reversal:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create reversal',
    });
  }
});

/**
 * GET /api/ledger/discrepancies
 * Find any discrepancies between account balances and ledger totals
 * This is a critical audit endpoint
 */
router.get('/discrepancies', async (req: Request, res: Response) => {
  try {
    // Compare actual account balances with calculated ledger balances
    const discrepancies = await query(`
      WITH ledger_balances AS (
        SELECT 
          account_id,
          SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) -
          SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) as ledger_balance
        FROM ledger_entries
        WHERE is_system_entry = false
        GROUP BY account_id
      )
      SELECT 
        a.id as account_id,
        a.account_number,
        a.balance as actual_balance,
        COALESCE(lb.ledger_balance, 0) as ledger_balance,
        a.balance - COALESCE(lb.ledger_balance, 0) as discrepancy
      FROM accounts a
      LEFT JOIN ledger_balances lb ON a.id = lb.account_id
      WHERE ABS(a.balance - COALESCE(lb.ledger_balance, 0)) > 0.01
    `);

    const hasDiscrepancies = discrepancies.rowCount && discrepancies.rowCount > 0;

    if (hasDiscrepancies) {
      console.error('ALERT: Account discrepancies detected!', discrepancies.rows);
    }

    res.json({
      success: true,
      hasDiscrepancies,
      data: discrepancies.rows,
      message: hasDiscrepancies 
        ? 'ALERT: Discrepancies detected between account balances and ledger' 
        : 'No discrepancies found - all accounts match ledger',
    });
  } catch (error) {
    console.error('Error checking discrepancies:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check discrepancies',
    });
  }
});

/**
 * GET /api/ledger/daily-balance
 * Get daily balance report for audit trail
 */
router.get('/daily-balance', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    const dailyBalance = await query(`
      SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as daily_debits,
        SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) as daily_credits,
        COUNT(*) as entry_count
      FROM ledger_entries
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Verify each day is balanced
    const dailyData = dailyBalance.rows.map(row => ({
      ...row,
      isBalanced: Math.abs(parseFloat(row.daily_debits) - parseFloat(row.daily_credits)) < 0.01,
    }));

    res.json({
      success: true,
      data: dailyData,
      period: `Last ${days} days`,
    });
  } catch (error) {
    console.error('Error fetching daily balance:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch daily balance',
    });
  }
});

export default router;
