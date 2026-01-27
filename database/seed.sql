-- Seed Data for Aura Bank

-- Insert Admin User
INSERT INTO users (id, full_name, email, password_hash, role, kyc_status)
VALUES (
    uuid_generate_v4(),
    'Admin User',
    'admin@aurabank.com',
    'hashed_secret_password',
    'ADMIN',
    'VERIFIED'
) ON CONFLICT (email) DO NOTHING;

-- Insert User 1: Alex Morgan (Main Demo User)
DO $$
DECLARE
    alex_id UUID := uuid_generate_v4();
    account_id UUID := uuid_generate_v4();
BEGIN
    -- Check if user already exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'alex.morgan@example.com') THEN
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

        -- Create Transactions
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
    END IF;
END $$;

-- Insert Generic User with Pending Loan Application
DO $$
DECLARE
    user_id UUID := uuid_generate_v4();
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'sarah@example.com') THEN
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
    END IF;
END $$;

-- Insert System Config
INSERT INTO system_config (config_key, config_value, description) VALUES
('maintenance_mode', 'false', 'Global maintenance mode switch'),
('default_currency', 'USD', 'Base currency for the system'),
('savings_interest_rate', '2.5', 'Annual interest rate for savings accounts'),
('fd_base_rate', '4.75', 'Base interest rate for Fixed Deposits')
ON CONFLICT (config_key) DO NOTHING;
