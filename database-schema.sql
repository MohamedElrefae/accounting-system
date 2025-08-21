-- Accounting System Database Schema
-- Run this in your Supabase SQL editor to create the necessary tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Accounts table - Chart of Accounts
CREATE TABLE accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    balance DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_account_name UNIQUE(name)
);

-- Transactions table - Simple transactions (for basic accounting)
CREATE TABLE transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Journal Entries table - Double-entry bookkeeping
CREATE TABLE journal_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    reference VARCHAR(100), -- Reference number for the entry
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Journal Entry Lines table - Individual debit/credit lines
CREATE TABLE journal_entry_lines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    debit_amount DECIMAL(15, 2) DEFAULT 0.00,
    credit_amount DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_debit_credit_not_both CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR 
        (credit_amount > 0 AND debit_amount = 0) OR 
        (debit_amount = 0 AND credit_amount = 0)
    )
);

-- Indexes for better performance
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_journal_entries_date ON journal_entries(date);
CREATE INDEX idx_journal_entry_lines_journal_entry_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_account_id ON journal_entry_lines(account_id);

-- RLS (Row Level Security) policies
-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations for authenticated users
-- You can customize these policies based on your security requirements
CREATE POLICY "Allow all operations on accounts for authenticated users" ON accounts
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations on transactions for authenticated users" ON transactions
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations on journal_entries for authenticated users" ON journal_entries
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations on journal_entry_lines for authenticated users" ON journal_entry_lines
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert some sample data
INSERT INTO accounts (name, type, balance) VALUES
    ('Cash', 'asset', 10000.00),
    ('Accounts Receivable', 'asset', 5000.00),
    ('Equipment', 'asset', 25000.00),
    ('Accounts Payable', 'liability', 3000.00),
    ('Capital Stock', 'equity', 30000.00),
    ('Sales Revenue', 'revenue', 0.00),
    ('Office Expenses', 'expense', 0.00),
    ('Utilities Expense', 'expense', 0.00);

-- Insert sample journal entry
WITH new_journal_entry AS (
    INSERT INTO journal_entries (description, reference, date) 
    VALUES ('Sale of goods for cash', 'JE-001', CURRENT_DATE) 
    RETURNING id
)
INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount)
SELECT 
    nje.id,
    CASE 
        WHEN a.name = 'Cash' THEN a.id
        WHEN a.name = 'Sales Revenue' THEN a.id
    END,
    CASE WHEN a.name = 'Cash' THEN 1000.00 ELSE 0.00 END,
    CASE WHEN a.name = 'Sales Revenue' THEN 1000.00 ELSE 0.00 END
FROM new_journal_entry nje
CROSS JOIN accounts a
WHERE a.name IN ('Cash', 'Sales Revenue');

-- Functions to maintain data integrity
-- Function to validate journal entries (debits = credits)
CREATE OR REPLACE FUNCTION validate_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    total_debits DECIMAL(15, 2);
    total_credits DECIMAL(15, 2);
BEGIN
    -- Calculate totals for the journal entry
    SELECT 
        COALESCE(SUM(debit_amount), 0),
        COALESCE(SUM(credit_amount), 0)
    INTO total_debits, total_credits
    FROM journal_entry_lines
    WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);
    
    -- Check if debits equal credits
    IF ABS(total_debits - total_credits) > 0.01 THEN
        RAISE EXCEPTION 'Journal entry debits (%) must equal credits (%)', total_debits, total_credits;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate journal entries
CREATE TRIGGER validate_journal_entry_trigger
    AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
    FOR EACH ROW EXECUTE FUNCTION validate_journal_entry();

-- Function to update account balances (optional - you might want to calculate on-the-fly)
CREATE OR REPLACE FUNCTION calculate_account_balance(account_uuid UUID)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    balance DECIMAL(15, 2) := 0;
    account_type VARCHAR(50);
BEGIN
    -- Get account type
    SELECT type INTO account_type FROM accounts WHERE id = account_uuid;
    
    -- Calculate balance based on journal entry lines
    SELECT 
        CASE 
            WHEN account_type IN ('asset', 'expense') THEN 
                COALESCE(SUM(debit_amount - credit_amount), 0)
            WHEN account_type IN ('liability', 'equity', 'revenue') THEN 
                COALESCE(SUM(credit_amount - debit_amount), 0)
            ELSE 0
        END
    INTO balance
    FROM journal_entry_lines
    WHERE account_id = account_uuid;
    
    RETURN balance;
END;
$$ LANGUAGE plpgsql;

-- Update account balances based on journal entries
UPDATE accounts 
SET balance = calculate_account_balance(id);

-- View for trial balance
CREATE VIEW trial_balance AS
SELECT 
    a.id,
    a.name,
    a.type,
    calculate_account_balance(a.id) as balance,
    CASE 
        WHEN calculate_account_balance(a.id) >= 0 AND a.type IN ('asset', 'expense') 
        THEN calculate_account_balance(a.id) 
        ELSE 0 
    END as debit_balance,
    CASE 
        WHEN calculate_account_balance(a.id) >= 0 AND a.type IN ('liability', 'equity', 'revenue') 
        THEN calculate_account_balance(a.id)
        WHEN calculate_account_balance(a.id) < 0 
        THEN ABS(calculate_account_balance(a.id))
        ELSE 0 
    END as credit_balance
FROM accounts a
WHERE calculate_account_balance(a.id) != 0
ORDER BY a.name;
