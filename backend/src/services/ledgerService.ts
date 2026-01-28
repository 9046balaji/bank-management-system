/**
 * Double-Entry Ledger Service
 * 
 * Implements the fundamental accounting principle:
 * For every transaction, the sum of debits must equal the sum of credits.
 * 
 * DEBIT: Increases assets (money going INTO an account)
 * CREDIT: Decreases assets (money going OUT of an account)
 * 
 * Example Transfer of $100 from Account A to Account B:
 *   DEBIT  Account B  $100 (receiving money, balance increases)
 *   CREDIT Account A  $100 (sending money, balance decreases)
 *   Net = 0 ✓
 */

import pool from '../db/connection';
import { PoolClient } from 'pg';
import { AppError } from '../middleware/errorMiddleware';
import { v4 as uuidv4 } from 'uuid';

// System account IDs (fixed UUIDs from ledger_schema.sql)
const SYSTEM_ACCOUNTS = {
  BANK_CASH: '00000000-0000-0000-0000-000000000001',
  BANK_REVENUE: '00000000-0000-0000-0000-000000000002',
  BANK_FEES: '00000000-0000-0000-0000-000000000003',
  SUSPENSE: '00000000-0000-0000-0000-000000000004',
  BANK_LOANS: '00000000-0000-0000-0000-000000000005',
};

// Entry types for double-entry accounting
export type EntryType = 'DEBIT' | 'CREDIT';

// Transaction types we support
export type LedgerTransactionType = 
  | 'TRANSFER' 
  | 'DEPOSIT' 
  | 'WITHDRAWAL' 
  | 'INTEREST' 
  | 'FEE' 
  | 'ADJUSTMENT'
  | 'REVERSAL'
  | 'LOAN_DISBURSEMENT'
  | 'LOAN_PAYMENT';

// Ledger entry structure
export interface LedgerEntry {
  id: string;
  transaction_id: string;
  ledger_account_id: string;
  entry_type: EntryType;
  amount: number;
  signed_amount: number;
  running_balance?: number;
  description?: string;
  reference_type?: string;
  reference_id?: string;
  created_at: Date;
}

// Result of a ledger operation
export interface LedgerResult {
  transactionId: string;
  entries: LedgerEntry[];
  verified: boolean;
}

// Balance verification result
export interface BalanceVerification {
  isBalanced: boolean;
  totalDebits: number;
  totalCredits: number;
  difference: number;
  lastVerifiedAt: Date;
}

/**
 * Generate a unique transaction ID for ledger entries (UUID)
 */
export function generateLedgerTransactionId(): string {
  return uuidv4();
}

/**
 * Get or create a ledger account for a user account
 */
async function getOrCreateUserLedgerAccount(
  userAccountId: number,
  client: PoolClient
): Promise<string> {
  // Check if ledger account exists for this user account
  const existing = await client.query(
    `SELECT id FROM ledger_accounts WHERE account_type = 'USER' AND reference_id = $1::text::uuid`,
    [userAccountId.toString().padStart(36, '0')]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Get account details to create ledger account
  const accountResult = await client.query(
    `SELECT a.id, a.account_number, u.full_name 
     FROM accounts a 
     JOIN users u ON a.user_id = u.id 
     WHERE a.id = $1`,
    [userAccountId]
  );

  if (accountResult.rows.length === 0) {
    throw new AppError('Account not found', 404);
  }

  const account = accountResult.rows[0];
  const ledgerAccountId = uuidv4();

  await client.query(
    `INSERT INTO ledger_accounts (id, account_type, reference_id, name, description, is_system_account)
     VALUES ($1, 'USER', NULL, $2, $3, false)`,
    [ledgerAccountId, `${account.full_name} - ${account.account_number}`, `User account ${account.account_number}`]
  );

  return ledgerAccountId;
}

/**
 * Create a pair of ledger entries for a transfer between accounts
 * This is the core double-entry function
 */
export async function createTransferEntries(
  fromAccountId: number,
  toAccountId: number,
  amount: number,
  description: string,
  client?: PoolClient
): Promise<LedgerResult> {
  const shouldReleaseClient = !client;
  const dbClient = client || await pool.connect();
  
  try {
    if (!client) {
      await dbClient.query('BEGIN');
    }

    const transactionId = generateLedgerTransactionId();

    // Verify sender has sufficient balance
    const senderBalance = await dbClient.query(
      'SELECT balance FROM accounts WHERE id = $1 FOR UPDATE',
      [fromAccountId]
    );

    if (senderBalance.rows.length === 0) {
      throw new AppError('Source account not found', 404);
    }

    const currentBalance = parseFloat(senderBalance.rows[0].balance);
    if (currentBalance < amount) {
      throw new AppError('Insufficient funds', 400);
    }

    // Get receiver account (lock it too)
    const receiverBalance = await dbClient.query(
      'SELECT balance FROM accounts WHERE id = $1 FOR UPDATE',
      [toAccountId]
    );

    if (receiverBalance.rows.length === 0) {
      throw new AppError('Destination account not found', 404);
    }

    // Get or create ledger accounts for both parties
    const fromLedgerAccountId = await getOrCreateUserLedgerAccount(fromAccountId, dbClient);
    const toLedgerAccountId = await getOrCreateUserLedgerAccount(toAccountId, dbClient);

    // Create CREDIT entry for sender (money leaving)
    const creditEntry = await dbClient.query(
      `INSERT INTO ledger_entries 
       (transaction_id, ledger_account_id, entry_type, amount, description, reference_type, reference_id)
       VALUES ($1, $2, 'CREDIT', $3, $4, 'TRANSFER', $5)
       RETURNING *`,
      [transactionId, fromLedgerAccountId, amount, `Transfer out: ${description}`, `ACC-${fromAccountId}`]
    );

    // Create DEBIT entry for receiver (money arriving)
    const debitEntry = await dbClient.query(
      `INSERT INTO ledger_entries 
       (transaction_id, ledger_account_id, entry_type, amount, description, reference_type, reference_id)
       VALUES ($1, $2, 'DEBIT', $3, $4, 'TRANSFER', $5)
       RETURNING *`,
      [transactionId, toLedgerAccountId, amount, `Transfer in: ${description}`, `ACC-${toAccountId}`]
    );

    // Update actual account balances
    await dbClient.query(
      'UPDATE accounts SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [amount, fromAccountId]
    );

    await dbClient.query(
      'UPDATE accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [amount, toAccountId]
    );

    // Verify this specific transaction balances (sum of signed_amount = 0)
    const verification = await dbClient.query(
      `SELECT 
         SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as total_debits,
         SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) as total_credits
       FROM ledger_entries 
       WHERE transaction_id = $1`,
      [transactionId]
    );

    const { total_debits, total_credits } = verification.rows[0];
    const isBalanced = parseFloat(total_debits) === parseFloat(total_credits);

    if (!isBalanced) {
      throw new AppError('Ledger integrity violation: debits do not equal credits', 500);
    }

    if (!client) {
      await dbClient.query('COMMIT');
    }

    return {
      transactionId,
      entries: [creditEntry.rows[0], debitEntry.rows[0]],
      verified: isBalanced
    };

  } catch (error) {
    if (!client) {
      await dbClient.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (shouldReleaseClient) {
      dbClient.release();
    }
  }
}

/**
 * Create a deposit entry (money coming into the system)
 * This creates entries against a system "Bank Cash" account
 */
export async function createDepositEntry(
  accountId: number,
  amount: number,
  description: string,
  client?: PoolClient
): Promise<LedgerResult> {
  const shouldReleaseClient = !client;
  const dbClient = client || await pool.connect();

  try {
    if (!client) {
      await dbClient.query('BEGIN');
    }

    const transactionId = generateLedgerTransactionId();

    // Get or create ledger account for user
    const userLedgerAccountId = await getOrCreateUserLedgerAccount(accountId, dbClient);

    // Use system Bank Cash account
    const bankCashAccountId = SYSTEM_ACCOUNTS.BANK_CASH;

    // DEBIT customer account (money coming in, balance increases)
    const debitEntry = await dbClient.query(
      `INSERT INTO ledger_entries 
       (transaction_id, ledger_account_id, entry_type, amount, description, reference_type, reference_id)
       VALUES ($1, $2, 'DEBIT', $3, $4, 'DEPOSIT', $5)
       RETURNING *`,
      [transactionId, userLedgerAccountId, amount, `Deposit: ${description}`, `ACC-${accountId}`]
    );

    // CREDIT system cash account (cash leaving the vault/external source)
    const creditEntry = await dbClient.query(
      `INSERT INTO ledger_entries 
       (transaction_id, ledger_account_id, entry_type, amount, description, reference_type, reference_id)
       VALUES ($1, $2, 'CREDIT', $3, $4, 'DEPOSIT', $5)
       RETURNING *`,
      [transactionId, bankCashAccountId, amount, `Customer deposit: ${description}`, `ACC-${accountId}`]
    );

    // Update customer account balance
    await dbClient.query(
      'UPDATE accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [amount, accountId]
    );

    if (!client) {
      await dbClient.query('COMMIT');
    }

    return {
      transactionId,
      entries: [debitEntry.rows[0], creditEntry.rows[0]],
      verified: true
    };

  } catch (error) {
    if (!client) {
      await dbClient.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (shouldReleaseClient) {
      dbClient.release();
    }
  }
}

/**
 * Create a withdrawal entry (money leaving the system)
 */
export async function createWithdrawalEntry(
  accountId: number,
  amount: number,
  description: string,
  client?: PoolClient
): Promise<LedgerResult> {
  const shouldReleaseClient = !client;
  const dbClient = client || await pool.connect();

  try {
    if (!client) {
      await dbClient.query('BEGIN');
    }

    const transactionId = generateLedgerTransactionId();

    // Verify sufficient balance
    const accountResult = await dbClient.query(
      'SELECT balance FROM accounts WHERE id = $1 FOR UPDATE',
      [accountId]
    );

    if (accountResult.rows.length === 0) {
      throw new AppError('Account not found', 404);
    }

    const currentBalance = parseFloat(accountResult.rows[0].balance);
    if (currentBalance < amount) {
      throw new AppError('Insufficient funds', 400);
    }

    // Get or create ledger account for user
    const userLedgerAccountId = await getOrCreateUserLedgerAccount(accountId, dbClient);

    // Use system Bank Cash account
    const bankCashAccountId = SYSTEM_ACCOUNTS.BANK_CASH;

    // CREDIT customer account (money leaving, balance decreases)
    const creditEntry = await dbClient.query(
      `INSERT INTO ledger_entries 
       (transaction_id, ledger_account_id, entry_type, amount, description, reference_type, reference_id)
       VALUES ($1, $2, 'CREDIT', $3, $4, 'WITHDRAWAL', $5)
       RETURNING *`,
      [transactionId, userLedgerAccountId, amount, `Withdrawal: ${description}`, `ACC-${accountId}`]
    );

    // DEBIT system cash account (cash going to customer)
    const debitEntry = await dbClient.query(
      `INSERT INTO ledger_entries 
       (transaction_id, ledger_account_id, entry_type, amount, description, reference_type, reference_id)
       VALUES ($1, $2, 'DEBIT', $3, $4, 'WITHDRAWAL', $5)
       RETURNING *`,
      [transactionId, bankCashAccountId, amount, `Customer withdrawal: ${description}`, `ACC-${accountId}`]
    );

    // Update customer account balance
    await dbClient.query(
      'UPDATE accounts SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [amount, accountId]
    );

    if (!client) {
      await dbClient.query('COMMIT');
    }

    return {
      transactionId,
      entries: [creditEntry.rows[0], debitEntry.rows[0]],
      verified: true
    };

  } catch (error) {
    if (!client) {
      await dbClient.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (shouldReleaseClient) {
      dbClient.release();
    }
  }
}

/**
 * Create a fee entry (money going to the bank as revenue)
 */
export async function createFeeEntry(
  accountId: number,
  amount: number,
  feeType: string,
  client?: PoolClient
): Promise<LedgerResult> {
  const shouldReleaseClient = !client;
  const dbClient = client || await pool.connect();

  try {
    if (!client) {
      await dbClient.query('BEGIN');
    }

    const transactionId = generateLedgerTransactionId();

    // Get or create fee income system account
    let feeAccountResult = await dbClient.query(
      "SELECT id FROM system_accounts WHERE account_type = 'FEE_INCOME' LIMIT 1"
    );

    let feeAccountId: number;
    if (feeAccountResult.rows.length === 0) {
      const newFeeAccount = await dbClient.query(
        `INSERT INTO system_accounts (account_type, name, description, balance)
         VALUES ('FEE_INCOME', 'Fee Income Account', 'Revenue from customer fees', 0)
         RETURNING id`
      );
      feeAccountId = newFeeAccount.rows[0].id;
    } else {
      feeAccountId = feeAccountResult.rows[0].id;
    }

    // CREDIT customer account (fee charged)
    const creditEntry = await dbClient.query(
      `INSERT INTO ledger_entries 
       (transaction_id, account_id, entry_type, amount, description, transaction_type)
       VALUES ($1, $2, 'CREDIT', $3, $4, 'FEE')
       RETURNING *`,
      [transactionId, accountId, amount, `Fee: ${feeType}`]
    );

    // DEBIT fee income account (revenue)
    const debitEntry = await dbClient.query(
      `INSERT INTO ledger_entries 
       (transaction_id, account_id, entry_type, amount, description, transaction_type, is_system_entry)
       VALUES ($1, $2, 'DEBIT', $3, $4, 'FEE', true)
       RETURNING *`,
      [transactionId, feeAccountId, amount, `Fee collected: ${feeType}`]
    );

    // Update customer account balance
    await dbClient.query(
      'UPDATE accounts SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [amount, accountId]
    );

    // Update fee income account
    await dbClient.query(
      'UPDATE system_accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [amount, feeAccountId]
    );

    if (!client) {
      await dbClient.query('COMMIT');
    }

    return {
      transactionId,
      entries: [creditEntry.rows[0], debitEntry.rows[0]],
      verified: true
    };

  } catch (error) {
    if (!client) {
      await dbClient.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (shouldReleaseClient) {
      dbClient.release();
    }
  }
}

/**
 * Verify that the entire ledger is balanced
 * Sum of all debits should equal sum of all credits
 */
export async function verifyLedgerBalance(): Promise<BalanceVerification> {
  const result = await pool.query(`
    SELECT 
      COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END), 0) as total_debits,
      COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END), 0) as total_credits
    FROM ledger_entries
  `);

  const { total_debits, total_credits } = result.rows[0];
  const debits = parseFloat(total_debits);
  const credits = parseFloat(total_credits);
  const difference = Math.abs(debits - credits);

  // Allow for small floating point differences (< 1 cent)
  const isBalanced = difference < 0.01;

  return {
    isBalanced,
    totalDebits: debits,
    totalCredits: credits,
    difference,
    lastVerifiedAt: new Date()
  };
}

/**
 * Verify a specific transaction is balanced
 */
export async function verifyTransactionBalance(transactionId: string): Promise<BalanceVerification> {
  const result = await pool.query(`
    SELECT 
      COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END), 0) as total_debits,
      COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END), 0) as total_credits
    FROM ledger_entries
    WHERE transaction_id = $1
  `, [transactionId]);

  const { total_debits, total_credits } = result.rows[0];
  const debits = parseFloat(total_debits);
  const credits = parseFloat(total_credits);
  const difference = Math.abs(debits - credits);

  return {
    isBalanced: difference < 0.01,
    totalDebits: debits,
    totalCredits: credits,
    difference,
    lastVerifiedAt: new Date()
  };
}

/**
 * Get ledger entries for a specific account
 */
export async function getAccountLedgerEntries(
  accountId: number,
  limit: number = 50,
  offset: number = 0
): Promise<LedgerEntry[]> {
  const result = await pool.query(
    `SELECT * FROM ledger_entries 
     WHERE account_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [accountId, limit, offset]
  );

  return result.rows;
}

/**
 * Get a transaction by ID with all its entries
 */
export async function getTransactionEntries(transactionId: string): Promise<LedgerEntry[]> {
  const result = await pool.query(
    'SELECT * FROM ledger_entries WHERE transaction_id = $1 ORDER BY created_at',
    [transactionId]
  );

  return result.rows;
}

/**
 * Get ledger summary for audit purposes
 */
export async function getLedgerSummary(): Promise<{
  totalTransactions: number;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  byType: Record<string, { debits: number; credits: number }>;
}> {
  const summaryResult = await pool.query(`
    SELECT 
      COUNT(DISTINCT transaction_id) as total_transactions,
      SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as total_debits,
      SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) as total_credits
    FROM ledger_entries
  `);

  const byTypeResult = await pool.query(`
    SELECT 
      transaction_type,
      SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as debits,
      SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) as credits
    FROM ledger_entries
    GROUP BY transaction_type
  `);

  const { total_transactions, total_debits, total_credits } = summaryResult.rows[0];
  const debits = parseFloat(total_debits || '0');
  const credits = parseFloat(total_credits || '0');

  const byType: Record<string, { debits: number; credits: number }> = {};
  for (const row of byTypeResult.rows) {
    byType[row.transaction_type] = {
      debits: parseFloat(row.debits),
      credits: parseFloat(row.credits)
    };
  }

  return {
    totalTransactions: parseInt(total_transactions || '0'),
    totalDebits: debits,
    totalCredits: credits,
    isBalanced: Math.abs(debits - credits) < 0.01,
    byType
  };
}

/**
 * Create a reversal entry for a previous transaction
 * This creates opposite entries to undo a transaction
 */
export async function createReversalEntry(
  originalTransactionId: string,
  reason: string,
  client?: PoolClient
): Promise<LedgerResult> {
  const shouldReleaseClient = !client;
  const dbClient = client || await pool.connect();

  try {
    if (!client) {
      await dbClient.query('BEGIN');
    }

    // Get original entries
    const originalEntries = await dbClient.query(
      'SELECT * FROM ledger_entries WHERE transaction_id = $1',
      [originalTransactionId]
    );

    if (originalEntries.rows.length === 0) {
      throw new AppError('Original transaction not found', 404);
    }

    const reversalTransactionId = generateLedgerTransactionId();
    const reversalEntries: LedgerEntry[] = [];

    // Create opposite entries for each original entry
    for (const entry of originalEntries.rows) {
      const reversedType: EntryType = entry.entry_type === 'DEBIT' ? 'CREDIT' : 'DEBIT';
      
      const reversalEntry = await dbClient.query(
        `INSERT INTO ledger_entries 
         (transaction_id, account_id, entry_type, amount, description, transaction_type, is_system_entry)
         VALUES ($1, $2, $3, $4, $5, 'REVERSAL', $6)
         RETURNING *`,
        [
          reversalTransactionId,
          entry.account_id,
          reversedType,
          entry.amount,
          `Reversal of ${originalTransactionId}: ${reason}`,
          entry.is_system_entry
        ]
      );

      reversalEntries.push(reversalEntry.rows[0]);

      // Update account balance accordingly
      const balanceAdjustment = reversedType === 'DEBIT' ? entry.amount : -entry.amount;
      
      if (entry.is_system_entry) {
        await dbClient.query(
          'UPDATE system_accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [balanceAdjustment, entry.account_id]
        );
      } else {
        await dbClient.query(
          'UPDATE accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [balanceAdjustment, entry.account_id]
        );
      }
    }

    // Mark original transaction as reversed
    await dbClient.query(
      `UPDATE ledger_entries 
       SET description = description || ' [REVERSED by ' || $1 || ']'
       WHERE transaction_id = $2`,
      [reversalTransactionId, originalTransactionId]
    );

    if (!client) {
      await dbClient.query('COMMIT');
    }

    return {
      transactionId: reversalTransactionId,
      entries: reversalEntries,
      verified: true
    };

  } catch (error) {
    if (!client) {
      await dbClient.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (shouldReleaseClient) {
      dbClient.release();
    }
  }
}

export default {
  generateLedgerTransactionId,
  createTransferEntries,
  createDepositEntry,
  createWithdrawalEntry,
  createFeeEntry,
  verifyLedgerBalance,
  verifyTransactionBalance,
  getAccountLedgerEntries,
  getTransactionEntries,
  getLedgerSummary,
  createReversalEntry
};
