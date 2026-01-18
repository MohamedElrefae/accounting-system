-- Quick Diagnosis for Account Update Issue
-- Focus on finding the exact problem with debit_account_id error

-- 1. Check what account_update function actually exists
SELECT 
    'Current Account Update Function' as info,
    proname,
    prosrc::text as function_definition
FROM pg_proc 
WHERE proname = 'account_update' 
AND pronamespace = 'public'::regnamespace;

-- 2. Check accounts table columns to see what's available
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'accounts'
AND column_name LIKE '%account%'
ORDER BY ordinal_position;

-- 3. Test the exact error scenario
-- Try to update with minimal data to see exact error
DO $$
DECLARE
    v_error_message text;
BEGIN
    -- Try the simplest possible update
    UPDATE public.accounts 
    SET code = 'TEST'
    WHERE id = '00000000-0000-0000-0000-0000-0001'::uuid;
    
    IF FOUND THEN
        RAISE NOTICE 'Simple UPDATE succeeded';
    ELSE
        RAISE NOTICE 'Account not found for test';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_message;
    RAISE NOTICE 'UPDATE failed with error: %', v_error_message;
END $$;

-- 4. Check if there are any rules/policies that might block updates
SELECT 
    'Active RLS Policies' as info,
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'accounts'
AND schemaname = 'public'
AND (cmd LIKE '%UPDATE%' OR cmd LIKE '%ALL%');

-- 5. Check for any other functions that might be called instead
SELECT 
    'Other Account Functions' as info,
    proname,
    prosrc::text
FROM pg_proc 
WHERE proname LIKE '%account%'
AND pronamespace = 'public'::regnamespace
AND proname != 'account_update'
ORDER BY proname;
