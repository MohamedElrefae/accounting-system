-- Verification SQL for transaction update and journal entry format fixes
-- Run this in Supabase SQL editor to verify the fix works correctly

-- 1. Test journal entry number format validation
SELECT 
    'Journal Entry Format Test' as test_name,
    entry_number,
    CASE 
        WHEN entry_number ~ '^JE-[0-9]{6}-[0-9]{4}$' THEN '✅ Valid Format'
        ELSE '❌ Invalid Format'
    END as format_status,
    LENGTH(entry_number) as entry_length,
    SPLIT_PART(entry_number, '-', 1) as prefix,
    SPLIT_PART(entry_number, '-', 2) as year_month,
    SPLIT_PART(entry_number, '-', 3) as sequence_number
FROM public.transactions 
WHERE entry_number IS NOT NULL
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Verify all existing transactions have correct format
SELECT 
    'Format Compliance Check' as test_name,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN entry_number ~ '^JE-[0-9]{6}-[0-9]{4}$' THEN 1 END) as valid_format_count,
    COUNT(CASE WHEN entry_number !~ '^JE-[0-9]{6}-[0-9]{4}$' THEN 1 END) as invalid_format_count
FROM public.transactions 
WHERE entry_number IS NOT NULL;

-- 3. Check for any transactions with invalid formats
SELECT 
    'Invalid Format Details' as test_name,
    entry_number,
    created_at,
    description
FROM public.transactions 
WHERE entry_number IS NOT NULL 
    AND entry_number !~ '^JE-[0-9]{6}-[0-9]{4}$'
ORDER BY created_at DESC;

-- 4. Test transaction update capability (read-only simulation)
-- This will show the structure without actually updating
SELECT 
    'Update Test Structure' as test_name,
    id,
    entry_number,
    description,
    amount,
    is_posted,
    updated_at
FROM public.transactions 
WHERE is_posted = false  -- Only show unposted transactions that can be updated
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Check transaction constraints and triggers
SELECT 
    'Constraint Check' as test_name,
    tc.constraint_name, 
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public' 
    AND tc.table_name = 'transactions'
    AND tc.constraint_type IN ('CHECK', 'UNIQUE', 'FOREIGN KEY');
