-- Diagnostic script for opening balance import issues
-- Run this in Supabase SQL editor to identify problems

-- 1. Check if opening_balance_imports table exists
SELECT 
    'opening_balance_imports table exists' as check,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'opening_balance_imports'
        ) THEN 'YES'
        ELSE 'NO'
    END as status;

-- 2. Check if import_opening_balances RPC function exists
SELECT 
    'import_opening_balances RPC function exists' as check,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = 'import_opening_balances'
        ) THEN 'YES'
        ELSE 'NO'
    END as status;

-- 3. Check if approval_requests table exists and workflow_id constraint
SELECT 
    column_name, 
    is_nullable, 
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'approval_requests'
    AND column_name = 'workflow_id'
ORDER BY ordinal_position;

-- 4. Check if fn_create_approval_request function exists
SELECT 
    'fn_create_approval_request function exists' as check,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = 'fn_create_approval_request'
        ) THEN 'YES'
        ELSE 'NO'
    END as status;

-- 5. Check if projects table has data
SELECT 
    'projects table has data' as check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM projects LIMIT 1) THEN 'YES'
        ELSE 'NO'
    END as status,
    COUNT(*) as project_count
FROM projects;

-- 6. Check if cost_centers table has data
SELECT 
    'cost_centers table has data' as check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM cost_centers LIMIT 1) THEN 'YES'
        ELSE 'NO'
    END as status,
    COUNT(*) as cost_center_count
FROM cost_centers;

-- 7. Check if accounts table has data
SELECT 
    'accounts table has data' as check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM accounts LIMIT 1) THEN 'YES'
        ELSE 'NO'
    END as status,
    COUNT(*) as account_count
FROM accounts;

-- 8. Check RLS policies on opening_balance_imports
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'opening_balance_imports' 
    AND schemaname = 'public';
