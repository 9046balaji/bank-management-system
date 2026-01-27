
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
    category VARCHAR(50) DEFAULT 'Others', -- ML-categorized expense category
    category_confidence DECIMAL(5, 2) DEFAULT 0, -- Confidence score from ML model
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
-- NOTE: Seed data has been moved to seed.sql
-- Run seed.sql separately after schema creation
-- ==========================================

