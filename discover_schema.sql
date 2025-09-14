-- Discover the actual database schema for GL functions
-- Run this to find the correct table names and structure

-- 1. Find all tables related to transactions
SELECT 
    table_name,
    table_type,
    'Table found' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name ILIKE '%transaction%' 
       OR table_name ILIKE '%entry%' 
       OR table_name ILIKE '%entries%'
       OR table_name ILIKE '%ledger%'
       OR table_name ILIKE '%journal%')
ORDER BY table_name;

-- 2. Find all tables related to accounts
SELECT 
    table_name,
    table_type,
    'Table found' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name ILIKE '%account%' 
       OR table_name ILIKE '%chart%')
ORDER BY table_name;

-- 3. Check for views that might be used instead of tables
SELECT 
    table_name,
    table_type,
    'View found' as status
FROM information_schema.views
WHERE table_schema = 'public' 
  AND (table_name ILIKE '%transaction%' 
       OR table_name ILIKE '%entry%' 
       OR table_name ILIKE '%account%'
       OR table_name ILIKE '%ledger%'
       OR table_name ILIKE '%gl%')
ORDER BY table_name;

-- 4. Show structure of the main transaction table (try common names)
-- Run each of these separately to see which one works:

-- Try: transactions table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'transactions'
ORDER BY ordinal_position;

-- Try: journal_entries table  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'journal_entries'
ORDER BY ordinal_position;

-- Try: transaction_items table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'transaction_items'
ORDER BY ordinal_position;

-- Try: ledger_entries table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'ledger_entries'
ORDER BY ordinal_position;

-- 5. Show structure of accounts table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'accounts'
ORDER BY ordinal_position;

-- 6. Look for existing GL functions to see what tables they use
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND (p.proname ILIKE '%ledger%' OR p.proname ILIKE '%gl_%' OR p.proname ILIKE '%general%')
LIMIT 3;