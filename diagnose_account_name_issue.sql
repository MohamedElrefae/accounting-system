-- Comprehensive Diagnosis for Account Name Edit Issues
-- Senior Engineer Approach: Trace data flow from UI to database

-- Step 1: Check accounts table constraints specifically for name fields
SELECT 
    'Name Field Constraints' as analysis_type,
    column_name,
    data_type,
    is_nullable,
    character_maximum_length,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'accounts'
AND column_name IN ('name', 'name_ar')
ORDER BY column_name;

-- Step 2: Check for triggers that might interfere with name updates
SELECT 
    'Name-Related Triggers' as analysis_type,
    tgname as trigger_name,
    tgenabled as is_enabled,
    tgtype as trigger_type,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name,
    CASE WHEN tgenabled = 'O' THEN 'Enabled' ELSE 'Disabled' END as status
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'accounts'
AND c.relnamespace = 'public'::regnamespace
AND tgfoid::regproc::text LIKE '%name%'
ORDER BY trigger_name;

-- Step 3: Check RLS policies that might block name updates
SELECT 
    'RLS Policies Affecting Updates' as analysis_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE WHEN cmd LIKE '%UPDATE%' OR cmd = 'ALL' THEN 'Affects Updates' ELSE 'Read Only' END as impact
FROM pg_policies 
WHERE tablename = 'accounts'
AND schemaname = 'public'
AND (cmd LIKE '%UPDATE%' OR cmd = 'ALL')
ORDER BY policyname;

-- Step 4: Test name update vs code update to identify difference
DO $$
DECLARE
    v_test_org_id uuid := '4cbba543-eb9c-4f32-9c77-155201f7e145'; -- Replace with actual org_id
    v_test_account_id uuid := '00000000-0000-0000-0000-0000-0001'; -- Replace with actual account_id
    v_code_result json;
    v_name_result json;
    v_error_message text;
BEGIN
    RAISE NOTICE '=== Testing Code Update vs Name Update ===';
    
    -- Test 1: Update only code (should work)
    BEGIN
        SELECT public.account_update(
            v_test_org_id,
            v_test_account_id,
            'TEST-CODE-001',
            'Original Name',
            'Original Name AR',
            'asset'::public.account_category,
            1,
            'active'::public.account_status
        ) INTO v_code_result;
        
        RAISE NOTICE 'CODE UPDATE SUCCESS: %', v_code_result::text;
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message;
        RAISE NOTICE 'CODE UPDATE FAILED: %', v_error_message;
    END;
    
    -- Test 2: Update only name (might fail)
    BEGIN
        SELECT public.account_update(
            v_test_org_id,
            v_test_account_id,
            'TEST-CODE-001',
            'Updated Name Test',
            'Updated Name AR Test',
            'asset'::public.account_category,
            1,
            'active'::public.account_status
        ) INTO v_name_result;
        
        RAISE NOTICE 'NAME UPDATE SUCCESS: %', v_name_result::text;
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message;
        RAISE NOTICE 'NAME UPDATE FAILED: %', v_error_message;
    END;
    
    RAISE NOTICE '=== Test Complete ===';
END $$;

-- Step 5: Check for any unique constraints on name fields
SELECT 
    'Unique Constraints' as analysis_type,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'accounts'
AND tc.table_schema = 'public'
AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.constraint_name;

-- Step 6: Check for any indexes that might interfere
SELECT 
    'Indexes on Name Fields' as analysis_type,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'accounts'
AND (indexdef LIKE '%name%' OR indexdef LIKE '%ar%')
ORDER BY indexname;

-- Step 7: Verify current account_update function handles names correctly
SELECT 
    'Function Source Check' as analysis_type,
    'Checking if account_update function properly handles name fields' as purpose,
    prosrc::text as function_source
FROM pg_proc 
WHERE proname = 'account_update' 
AND pronamespace = 'public'::regnamespace;

-- Step 8: Check for any audit triggers that might log name changes
SELECT 
    'Audit Triggers' as analysis_type,
    tgname as trigger_name,
    tgfoid::regproc as function_name,
    'This trigger logs account changes and might interfere with updates' as purpose
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'accounts'
AND c.relnamespace = 'public'::regnamespace
AND tgname LIKE '%audit%'
ORDER BY trigger_name;
