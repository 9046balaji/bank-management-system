
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ENUM DEFINITIONS
-- ==========================================

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('USER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE kyc_status_enum AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_type_enum AS ENUM ('SAVINGS', 'CURRENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type_enum AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'LOAN_PAYMENT', 'LOAN_DISBURSAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_status_enum AS ENUM ('COMPLETED', 'PENDING', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE card_status_enum AS ENUM ('ACTIVE', 'BLOCKED', 'FROZEN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE loan_status_enum AS ENUM ('ACTIVE', 'PENDING', 'REPAID', 'DEFAULTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_category_enum AS ENUM ('FRAUD', 'ACCOUNT', 'TECH', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status_enum AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- 2. TABLE DEFINITIONS
-- ==========================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- In production, use Argon2 or Bcrypt
    phone_number VARCHAR(20),
    date_of_birth DATE,
    address TEXT,
    kyc_status kyc_status_enum DEFAULT 'PENDING',
    role user_role_enum DEFAULT 'USER',
    avatar_url TEXT,
    
    -- JSONB columns to store frontend-specific preferences and settings
    notification_preferences JSONB DEFAULT '{
        "email": {"largeTransaction": true, "lowBalance": true, "security": true},
        "sms": {"largeTransaction": true, "lowBalance": false, "security": true},
        "push": {"largeTransaction": false, "lowBalance": true, "security": true}
    }'::jsonb,
    
    settings JSONB DEFAULT '{
        "currency": "USD",
        "maintenanceMode": false,
        "savingsRate": 2.5,
        "fdRate": 4.75,
        "cardFrozen": false,
        "onlinePayments": true,
        "intlUse": true,
        "dailyLimit": 1500
    }'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_type account_type_enum NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    type transaction_type_enum NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    counterparty_name VARCHAR(100),
    counterparty_account_number VARCHAR(50),
    status transaction_status_enum DEFAULT 'COMPLETED',
    reference_id VARCHAR(50),
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cards Table
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    card_number_masked VARCHAR(20) NOT NULL, -- Store only last 4 or masked version
    card_holder_name VARCHAR(100) NOT NULL,
    expiry_date VARCHAR(5) NOT NULL, -- MM/YY
    cvv_hash VARCHAR(255),
    pin_hash VARCHAR(255),
    status card_status_enum DEFAULT 'ACTIVE',
    daily_limit DECIMAL(15, 2) DEFAULT 1500.00,
    is_international_enabled BOOLEAN DEFAULT TRUE,
    is_online_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Loans Table (Active Loans)
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    loan_reference_id VARCHAR(20) UNIQUE, -- e.g., L-8839
    type VARCHAR(50) DEFAULT 'Personal Loan',
    loan_amount DECIMAL(15, 2) NOT NULL,
    outstanding_balance DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    term_months INTEGER NOT NULL,
    start_date DATE NOT NULL,
    next_emi_date DATE,
    emi_amount DECIMAL(15, 2),
    status loan_status_enum DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Loan Applications Table
CREATE TABLE IF NOT EXISTS loan_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_amount DECIMAL(15, 2) NOT NULL,
    monthly_income DECIMAL(15, 2),
    credit_score INTEGER,
    ai_risk_score INTEGER CHECK (ai_risk_score BETWEEN 0 AND 100),
    status loan_status_enum DEFAULT 'PENDING',
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_reference_id VARCHAR(20) UNIQUE, -- e.g., TK-1024
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(200) NOT NULL,
    category ticket_category_enum NOT NULL,
    description TEXT,
    status ticket_status_enum DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System Configuration Table
CREATE TABLE IF NOT EXISTS system_config (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON support_tickets(user_id);

-- ==========================================
-- 4. SEED DATA (MOCK DATA)
-- ==========================================

-- Insert Admin User
INSERT INTO users (id, full_name, email, password_hash, role, kyc_status)
VALUES (
    uuid_generate_v4(),
    'Admin User',
    'admin@aurabank.com',
    'hashed_secret_password',
    'ADMIN',
    'VERIFIED'
);

-- Insert User 1: Alex Morgan (Main Demo User)
DO $$
DECLARE
    alex_id UUID := uuid_generate_v4();
    account_id UUID := uuid_generate_v4();
BEGIN
    INSERT INTO users (id, full_name, email, password_hash, phone_number, address, kyc_status, role, avatar_url)
    VALUES (
        alex_id,
        'Alex Morgan',
        'alex.morgan@example.com',
        'hashed_password_123',
        '+1 (555) 123-4567',
        '123 Market Street, Suite 400, San Francisco, CA 94103',
        'VERIFIED',
        'USER',
        'https://picsum.photos/seed/alex/200'
    );

    -- Create Savings Account
    INSERT INTO accounts (id, user_id, account_number, account_type, balance)
    VALUES (
        account_id,
        alex_id,
        '9876543210',
        'SAVINGS',
        145000.00
    );

    -- Create Card
    INSERT INTO cards (account_id, card_number_masked, card_holder_name, expiry_date, status)
    VALUES (
        account_id,
        '•••• •••• •••• 4402',
        'ALEX MORGAN',
        '12/26',
        'ACTIVE'
    );

    -- Create Active Loan
    INSERT INTO loans (user_id, loan_reference_id, type, loan_amount, outstanding_balance, interest_rate, term_months, start_date, next_emi_date, emi_amount, status)
    VALUES (
        alex_id,
        'L-8839',
        'Personal Loan',
        12450.00,
        8200.00,
        8.5,
        36,
        '2023-01-01',
        '2023-11-15',
        450.00,
        'ACTIVE'
    );

    -- Create Transactions (Matching constants.ts)
    INSERT INTO transactions (account_id, type, amount, description, status, transaction_date) VALUES
    (account_id, 'DEPOSIT', 5000.00, 'HDFC Deposit', 'COMPLETED', '2023-10-24 10:23:00'),
    (account_id, 'WITHDRAWAL', 2000.00, 'ATM Withdrawal', 'COMPLETED', '2023-10-23 18:45:00'),
    (account_id, 'TRANSFER', 1299.00, 'Amazon India', 'COMPLETED', '2023-10-23 12:30:00'),
    (account_id, 'LOAN_PAYMENT', 450.00, 'Personal Loan EMI', 'COMPLETED', '2023-10-15 09:00:00'),
    (account_id, 'TRANSFER', 600.00, 'Concinaction', 'PENDING', '2023-10-14 11:15:00'),
    (account_id, 'TRANSFER', 45.90, 'Uber Rides', 'COMPLETED', '2023-10-14 08:30:00'),
    (account_id, 'WITHDRAWAL', 100.00, 'ATM Withdrawal', 'COMPLETED', '2023-10-12 19:20:00');

    -- Create Support Tickets
    INSERT INTO support_tickets (user_id, ticket_reference_id, subject, category, description, status, created_at) VALUES
    (alex_id, 'TK-1024', 'Double charge on coffee', 'FRAUD', 'I was charged twice at Starbucks.', 'OPEN', '2023-10-24 09:00:00'),
    (alex_id, 'TK-0998', 'Address Update', 'ACCOUNT', 'Moved to SF.', 'IN_PROGRESS', '2023-10-20 14:00:00');

END $$;

-- Insert Generic User with Pending Loan Application
DO $$
DECLARE
    user_id UUID := uuid_generate_v4();
BEGIN
    INSERT INTO users (id, full_name, email, password_hash, role)
    VALUES (
        user_id,
        'Sarah Jenkins',
        'sarah@example.com',
        'hashed_pw',
        'USER'
    );

    INSERT INTO loan_applications (user_id, requested_amount, monthly_income, credit_score, ai_risk_score, status)
    VALUES (
        user_id,
        45000.00,
        7500.00,
        720,
        92,
        'PENDING'
    );
END $$;

-- Insert System Config
INSERT INTO system_config (config_key, config_value, description) VALUES
('maintenance_mode', 'false', 'Global maintenance mode switch'),
('default_currency', 'USD', 'Base currency for the system'),
('savings_interest_rate', '2.5', 'Annual interest rate for savings accounts'),
('fd_base_rate', '4.75', 'Base interest rate for Fixed Deposits');

