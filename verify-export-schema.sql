-- Script to get current database schema for export testing
-- This will help verify the structure before testing Excel exports

-- Check accounts table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'accounts' 
ORDER BY ordinal_position;

-- Get sample accounts data for export testing
SELECT 
    id,
    code,
    name,
    name_ar,
    account_type,
    balance,
    created_at,
    is_active
FROM accounts 
LIMIT 10;

-- Check transactions table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Get sample transactions data for export testing
SELECT 
    id,
    entry_number,
    entry_date,
    description,
    amount,
    debit_account_id,
    credit_account_id,
    posted,
    created_at
FROM transactions 
LIMIT 10;

-- List all exportable tables
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN (
        'transactions',
        'accounts', 
        'organizations',
        'projects',
        'cost_centers',
        'work_items',
        'transaction_classifications',
        'expenses_categories'
    )
ORDER BY table_name;
