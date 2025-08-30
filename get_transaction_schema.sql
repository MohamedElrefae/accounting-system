-- Get current database schema for transactions
-- Run this in Supabase SQL editor to understand current structure

-- 1. Check transactions table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'transactions'
ORDER BY ordinal_position;

-- 2. Check current transaction data samples
SELECT 
    entry_number,
    entry_date,
    description,
    amount,
    is_posted,
    created_at
FROM public.transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check entry number patterns
SELECT 
    entry_number,
    CASE 
        WHEN entry_number ~ '^JE-[0-9]{6}-[0-9]{4}$' THEN 'Valid Format'
        ELSE 'Invalid Format'
    END as format_status,
    created_at
FROM public.transactions 
ORDER BY created_at DESC 
LIMIT 20;

-- 4. Check constraints on transactions table
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public' 
    AND tc.table_name = 'transactions';
