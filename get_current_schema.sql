-- Get current database schema and sample data for transaction classification implementation

-- Check existing tables structure
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
ORDER BY table_name, ordinal_position;

-- Get sample data from key tables
SELECT 'accounts' as table_name, count(*) as record_count FROM accounts
UNION ALL
SELECT 'transactions' as table_name, count(*) as record_count FROM transactions
UNION ALL
SELECT 'organizations' as table_name, count(*) as record_count FROM organizations;

-- Check if transaction_classification table already exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'transaction_classification'
) as table_exists;

-- Sample accounts data to understand structure
SELECT id, code, name, account_type, parent_id, organization_id 
FROM accounts 
WHERE organization_id IS NOT NULL 
LIMIT 5;

-- Sample transactions to understand structure  
SELECT id, account_id, description, amount, transaction_date, organization_id
FROM transactions 
WHERE organization_id IS NOT NULL 
LIMIT 5;
