-- Comprehensive Diagnosis for Account Update Issue
-- Senior Engineer Approach: Get exact schema and identify root cause
-- This script will help us understand what's really happening in the database

-- Step 1: Get exact accounts table structure
SELECT 
    'Accounts Table Structure' as analysis_type,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'accounts'
ORDER BY ordinal_position;

-- Step 2: Check all account_update function definitions
SELECT 
    'All Account Update Functions' as analysis_type,
    proname as function_name,
    pronargs as argument_count,
    proargtypes as argument_types,
    prosrc as function_source
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'account_update'
AND n.nspname = 'public'
ORDER BY proname;

-- Step 3: Check for any triggers on accounts table
SELECT 
    'Triggers on Accounts Table' as analysis_type,
    tgname as trigger_name,
    tgenabled as is_enabled,
    tgtype as trigger_type,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'accounts'
AND c.relnamespace = 'public'::regnamespace;

-- Step 4: Check for any views that reference accounts
SELECT 
    'Views Referencing Accounts' as analysis_type,
    viewname as view_name,
    viewowner as owner,
    definition
FROM information_schema.views
WHERE viewname LIKE '%account%'
AND schemaname = 'public'
ORDER BY viewname;

-- Step 5: Check enum types to ensure they exist
SELECT 
    'Account Category Enum' as analysis_type,
    enumlabel as enum_value,
    enumsortorder as sort_order
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'account_category'
AND t.typnamespace = 'public'::regnamespace
ORDER BY enumsortorder;

SELECT 
    'Account Status Enum' as analysis_type,
    enumlabel as enum_value,
    enumsortorder as sort_order
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'account_status'
AND t.typnamespace = 'public'::regnamespace
ORDER BY enumsortorder;

-- Step 6: Test the current account_update function with a safe call
-- This will show us exactly what error occurs
DO $$
DECLARE
    test_result json;
    test_error text;
BEGIN
    -- Try to call the function with safe test data
    -- Use a UUID that likely doesn't exist to avoid actual changes
    BEGIN
        SELECT public.account_update(
            '00000000-0000-0000-0000-0000-0000'::uuid, -- fake org_id
            '00000000-0000-0000-0000-0000-0001'::uuid, -- fake account_id
            'TEST001',
            'Test Account',
            'حساب اختبار',
            'asset'::public.account_category,
            1,
            'active'::public.account_status
        ) INTO test_result;
        
        RAISE NOTICE 'Account update test succeeded: %', test_result;
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS test_error;
        RAISE NOTICE 'Account update test failed: %', test_error;
    END;
END $$;

-- Step 7: Check for any row-level security policies that might interfere
SELECT 
    'RLS Policies on Accounts' as analysis_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'accounts'
AND schemaname = 'public'
ORDER BY policyname;

-- Step 8: Check if there are any foreign key constraints that might be referenced
SELECT 
    'Foreign Key Constraints' as analysis_type,
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'accounts'
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Step 9: Check for any materialized views that might reference accounts
SELECT 
    'Materialized Views' as analysis_type,
    schemaname,
    matviewname,
    definition
FROM pg_matviews mv
JOIN pg_namespace n ON n.oid = mv.schemaname
WHERE mv.matviewname LIKE '%account%'
AND n.nspname = 'public'
ORDER BY matviewname;

-- Step 10: Final diagnostic summary
SELECT 
    'Diagnostic Summary' as analysis_type,
    'Run complete. Review all sections above to identify the root cause of the debit_account_id error.' as message;
