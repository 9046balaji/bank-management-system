import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Pool } = pkg;

// Query logging configuration
const SLOW_QUERY_THRESHOLD_MS = 1000; // Log queries slower than 1 second
const LOG_ALL_QUERIES = process.env.DB_LOG_ALL_QUERIES === 'true';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'aurabank',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 30000, // 30 second query timeout
  application_name: 'aura-bank-api',
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('New database connection established');
  }
});

/**
 * Database health check with detailed statistics
 */
export interface DatabaseHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  connected: boolean;
  timestamp: string;
  poolStats: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  };
  responseTimeMs?: number;
  error?: string;
}

export const checkDatabaseHealth = async (): Promise<DatabaseHealthStatus> => {
  const start = Date.now();

  try {
    const result = await pool.query('SELECT NOW() as time, pg_database_size(current_database()) as db_size');
    const responseTimeMs = Date.now() - start;

    return {
      status: responseTimeMs > 5000 ? 'degraded' : 'healthy',
      connected: true,
      timestamp: result.rows[0].time,
      poolStats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      },
      responseTimeMs,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      timestamp: new Date().toISOString(),
      poolStats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Sanitize query for logging (remove sensitive data)
 */
function sanitizeQueryForLog(text: string): string {
  // Truncate very long queries
  if (text.length > 500) {
    return text.substring(0, 500) + '... (truncated)';
  }
  return text;
}

/**
 * Execute a database query with timing and logging
 */
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const queryId = Math.random().toString(36).substring(7);

  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log slow queries
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`[DB] Slow query [${queryId}]`, {
        query: sanitizeQueryForLog(text),
        duration: `${duration}ms`,
        rows: res.rowCount,
      });
    } else if (LOG_ALL_QUERIES) {
      console.log(`[DB] Query [${queryId}]`, {
        query: sanitizeQueryForLog(text),
        duration: `${duration}ms`,
        rows: res.rowCount,
      });
    }

    return res;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[DB] Query failed [${queryId}]`, {
      query: sanitizeQueryForLog(text),
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

// Run database migrations on startup
export const runMigrations = async () => {
  try {
    // Add APPROVED and REJECTED to loan_status_enum if they don't exist
    // PostgreSQL doesn't have IF NOT EXISTS for ADD VALUE in all versions,
    // so we need to check if they exist first
    const checkEnum = await pool.query(`
      SELECT enumlabel FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'loan_status_enum')
    `);

    const existingValues = checkEnum.rows.map((r: any) => r.enumlabel);

    if (!existingValues.includes('APPROVED')) {
      await pool.query(`ALTER TYPE loan_status_enum ADD VALUE 'APPROVED'`);
      console.log('Added APPROVED to loan_status_enum');
    }

    if (!existingValues.includes('REJECTED')) {
      await pool.query(`ALTER TYPE loan_status_enum ADD VALUE 'REJECTED'`);
      console.log('Added REJECTED to loan_status_enum');
    }

    // Add reviewed_at column to loan_applications if it doesn't exist
    const checkReviewedAt = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'loan_applications' AND column_name = 'reviewed_at'
    `);

    if (checkReviewedAt.rowCount === 0) {
      await pool.query(`ALTER TABLE loan_applications ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE`);
      console.log('Added reviewed_at column to loan_applications');
    }

    // Add updated_at column to accounts if it doesn't exist
    const checkAccountsUpdatedAt = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'accounts' AND column_name = 'updated_at'
    `);

    if (checkAccountsUpdatedAt.rowCount === 0) {
      await pool.query(`ALTER TABLE accounts ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`);
      console.log('Added updated_at column to accounts');
    }

    // Create ledger_accounts table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ledger_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_type VARCHAR(50) NOT NULL,
        reference_id UUID,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_system_account BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_reference UNIQUE (account_type, reference_id)
      )
    `);

    // Create system accounts for the bank
    await pool.query(`
      INSERT INTO ledger_accounts (id, account_type, name, description, is_system_account) VALUES
        ('00000000-0000-0000-0000-000000000001', 'BANK_CASH', 'Bank Cash Reserve', 'Main bank cash holding account', true),
        ('00000000-0000-0000-0000-000000000002', 'BANK_REVENUE', 'Bank Revenue', 'Interest and fee income', true),
        ('00000000-0000-0000-0000-000000000003', 'BANK_FEES', 'Bank Fees Collected', 'Transaction fees collected', true),
        ('00000000-0000-0000-0000-000000000004', 'SUSPENSE', 'Suspense Account', 'Temporary holding for pending transactions', true),
        ('00000000-0000-0000-0000-000000000005', 'BANK_LOANS', 'Bank Loans Receivable', 'Outstanding loan principal', true)
      ON CONFLICT (id) DO NOTHING
    `);

    // Create ledger_entries table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID NOT NULL,
        ledger_account_id UUID NOT NULL REFERENCES ledger_accounts(id),
        entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
        amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
        signed_amount DECIMAL(15, 2) GENERATED ALWAYS AS (
          CASE WHEN entry_type = 'DEBIT' THEN amount ELSE -amount END
        ) STORED,
        running_balance DECIMAL(15, 2),
        description TEXT,
        reference_type VARCHAR(50),
        reference_id VARCHAR(100),
        currency VARCHAR(3) DEFAULT 'USD',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID,
        is_reversed BOOLEAN DEFAULT FALSE,
        reversed_by_transaction_id UUID,
        reversal_reason TEXT
      )
    `);

    // Create indexes for ledger tables
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction_id ON ledger_entries(transaction_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ledger_entries_ledger_account ON ledger_entries(ledger_account_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON ledger_entries(created_at)`);

    // Create card_application_status_enum if it doesn't exist
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE card_application_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create card_type_enum if it doesn't exist
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE card_type_enum AS ENUM ('DEBIT', 'CREDIT', 'PREPAID');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add card_type column to cards table if it doesn't exist
    const checkCardType = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'cards' AND column_name = 'card_type'
    `);
    if (checkCardType.rowCount === 0) {
      await pool.query(`ALTER TABLE cards ADD COLUMN card_type VARCHAR(20) DEFAULT 'DEBIT'`);
      console.log('Added card_type column to cards table');
    }

    // Add credit_limit column to cards table if it doesn't exist
    const checkCreditLimit = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'cards' AND column_name = 'credit_limit'
    `);
    if (checkCreditLimit.rowCount === 0) {
      await pool.query(`ALTER TABLE cards ADD COLUMN credit_limit DECIMAL(15, 2) DEFAULT 0`);
      console.log('Added credit_limit column to cards table');
    }

    // Add available_credit column to cards table if it doesn't exist
    const checkAvailableCredit = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'cards' AND column_name = 'available_credit'
    `);
    if (checkAvailableCredit.rowCount === 0) {
      await pool.query(`ALTER TABLE cards ADD COLUMN available_credit DECIMAL(15, 2) DEFAULT 0`);
      console.log('Added available_credit column to cards table');
    }

    // Create card_applications table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS card_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
        card_type VARCHAR(20) DEFAULT 'CREDIT',
        requested_limit DECIMAL(15, 2),
        monthly_income DECIMAL(15, 2),
        employment_status VARCHAR(50),
        credit_score INTEGER,
        purpose TEXT,
        status VARCHAR(20) DEFAULT 'PENDING',
        ai_risk_score INTEGER,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        reviewed_by UUID REFERENCES users(id)
      )
    `);
    console.log('Card applications table ready');

    // Create system_config table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        config_key VARCHAR(100) PRIMARY KEY,
        config_value TEXT NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add category column if it doesn't exist (for existing tables)
    const checkCategory = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'system_config' AND column_name = 'category'
    `);
    if (checkCategory.rowCount === 0) {
      await pool.query(`ALTER TABLE system_config ADD COLUMN category VARCHAR(50) DEFAULT 'general'`);
      console.log('Added category column to system_config');
    }

    // Insert default system configuration values (only if not exists)
    await pool.query(`
      INSERT INTO system_config (config_key, config_value, description, category) VALUES
        ('maintenance_mode', 'false', 'System maintenance mode toggle', 'operations'),
        ('base_currency', 'INR', 'Default currency for transactions', 'financial'),
        ('savings_rate', '6.5', 'Savings account interest rate percentage', 'financial'),
        ('fd_rate', '7.25', 'Fixed deposit interest rate percentage', 'financial'),
        ('daily_transfer_limit', '500000', 'Maximum daily transfer limit per user (in base currency)', 'limits'),
        ('single_transfer_limit', '100000', 'Maximum single transfer amount', 'limits'),
        ('min_balance_savings', '1000', 'Minimum balance for savings accounts', 'limits'),
        ('min_balance_current', '5000', 'Minimum balance for current accounts', 'limits'),
        ('login_attempts_limit', '5', 'Max failed login attempts before lockout', 'security'),
        ('session_timeout_minutes', '30', 'User session timeout in minutes', 'security'),
        ('password_expiry_days', '90', 'Password expiry period in days', 'security'),
        ('two_factor_required', 'false', 'Require 2FA for all users', 'security'),
        ('rate_limit_requests', '100', 'API requests per minute per user', 'security'),
        ('fraud_detection_enabled', 'true', 'Enable AI fraud detection', 'features'),
        ('loan_auto_approval_enabled', 'false', 'Enable automatic loan approval for low-risk applications', 'features'),
        ('kyc_verification_required', 'true', 'Require KYC verification for transactions', 'features'),
        ('email_notifications_enabled', 'true', 'Enable email notifications', 'features'),
        ('sms_notifications_enabled', 'true', 'Enable SMS notifications', 'features'),
        ('last_updated_at', NOW()::text, 'Last configuration update timestamp', 'system'),
        ('last_updated_by', 'SYSTEM', 'Last configuration update admin', 'system')
      ON CONFLICT (config_key) DO NOTHING
    `);
    console.log('System config table ready with default values');

    // Create config_audit_log table for tracking changes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS config_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        config_key VARCHAR(100) NOT NULL,
        old_value TEXT,
        new_value TEXT NOT NULL,
        changed_by UUID REFERENCES users(id),
        changed_by_name VARCHAR(100),
        change_reason TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_config_audit_created_at ON config_audit_log(created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_config_audit_config_key ON config_audit_log(config_key)`);
    console.log('Config audit log table ready');

    // Create feedback table for user feedback
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'OTHER',
        category VARCHAR(50),
        subject VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        rating INTEGER CHECK (rating BETWEEN 1 AND 5),
        status VARCHAR(50) DEFAULT 'NEW',
        admin_response TEXT,
        responded_at TIMESTAMP WITH TIME ZONE,
        responded_by UUID REFERENCES users(id),
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type)`);
    console.log('Feedback table ready');

    // Create feedback_insights table for AI-generated summaries
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback_insights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID REFERENCES users(id),
        source_feedback_ids UUID[],
        summary_text TEXT NOT NULL,
        sentiment VARCHAR(20),
        solved_issues TEXT[],
        unsolved_issues TEXT[],
        key_issues TEXT[],
        action_items TEXT[],
        model_used VARCHAR(100) DEFAULT 'gemma3',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_feedback_insights_admin ON feedback_insights(admin_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_feedback_insights_created ON feedback_insights(created_at DESC)`);
    console.log('Feedback insights table ready');

    // Create loan_payments table for tracking EMI payments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loan_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
        amount DECIMAL(15, 2) NOT NULL,
        principal_amount DECIMAL(15, 2),
        interest_amount DECIMAL(15, 2),
        payment_method VARCHAR(50) DEFAULT 'AUTO_DEBIT',
        reference_number VARCHAR(50),
        paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_loan_payments_paid_at ON loan_payments(paid_at DESC)`);
    console.log('Loan payments table ready');

    console.log('Database migrations completed');
  } catch (error) {
    console.error('Migration error:', error);
    // Don't throw - allow server to start even if migrations fail
  }
};

export const getClient = async () => {
  return pool.connect();
};

export const closePool = async () => {
  await pool.end();
  console.log('Database pool closed');
};

export default pool;
