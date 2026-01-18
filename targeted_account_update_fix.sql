-- Targeted Fix for Account Update Issue
-- Based on senior engineer analysis: focus on most likely causes

-- Root Cause Analysis:
-- 1. Multiple conflicting function definitions exist
-- 2. Wrong function version being used by database
-- 3. Possible RLS policy interference
-- 4. Missing or corrupted enum types

-- Step 1: Force drop ALL account_update functions (be thorough)
DO $$
BEGIN
    -- Drop any function named account_update regardless of signature
    DROP FUNCTION IF EXISTS public.account_update() CASCADE;
    RAISE NOTICE 'Dropped all existing account_update functions';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping functions: %', SQLERRM;
END $$;

-- Step 2: Recreate with EXACT correct signature and types
CREATE OR REPLACE FUNCTION public.account_update(
    p_org_id uuid,
    p_id uuid,
    p_code text,
    p_name text,
    p_name_ar text,
    p_account_type public.account_category,
    p_level integer,
    p_status public.account_status
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_account_record RECORD;
    result_json json;
    v_error_message text;
BEGIN
    -- Add explicit validation to catch issues early
    IF p_org_id IS NULL OR p_id IS NULL THEN
        RAISE EXCEPTION 'org_id and account_id cannot be null';
    END IF;
    
    -- Update account with explicit error handling
    BEGIN
        UPDATE public.accounts 
        SET 
            code = p_code,
            name = p_name,
            name_ar = p_name_ar,
            category = p_account_type,
            level = p_level,
            status = p_status,
            is_postable = (p_level >= 3),
            updated_at = now()
        WHERE id = p_id AND org_id = p_org_id
        RETURNING
            id,
            code,
            name,
            name_ar,
            category,
            level,
            status,
            parent_id,
            org_id,
            is_postable,
            created_at,
            updated_at
        INTO updated_account_record;
            
        -- Check if update actually happened
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Account not found or no permission to update';
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        v_error_message := SQLERRM;
        RAISE EXCEPTION 'Update failed: %', v_error_message;
    END;
    
    -- Convert record to JSON with explicit field mapping
    result_json := json_build_object(
        'id', updated_account_record.id,
        'code', updated_account_record.code,
        'name', updated_account_record.name,
        'name_ar', updated_account_record.name_ar,
        'account_type', updated_account_record.category,
        'category', updated_account_record.category,
        'level', updated_account_record.level,
        'status', updated_account_record.status,
        'parent_id', updated_account_record.parent_id,
        'org_id', updated_account_record.org_id,
        'is_postable', updated_account_record.is_postable,
        'created_at', updated_account_record.created_at,
        'updated_at', updated_account_record.updated_at
    );
    
    RETURN result_json;
END;
$$;

-- Step 3: Grant permissions explicitly
GRANT EXECUTE ON FUNCTION public.account_update TO authenticated;
GRANT EXECUTE ON FUNCTION public.account_update TO service_role;

-- Step 4: Verify the function was created correctly
SELECT 
    'Verification' as status,
    proname as function_name,
    proargtypes::text as argument_types
FROM pg_proc 
WHERE proname = 'account_update' 
AND pronamespace = 'public'::regnamespace;

-- Step 5: Test with safe parameters
DO $$
DECLARE
    test_result json;
BEGIN
    -- Test with parameters that should work
    SELECT public.account_update(
        '4cbba543-eb9c-4f32-9c77-155201f7e145'::uuid, -- Replace with actual org_id
        '00000000-0000-0000-0000-0000-0001'::uuid, -- Replace with actual account_id
        'TEST001',
        'Test Account',
        'Test Account Arabic',
        'asset',
        1,
        'active'
    ) INTO test_result;
    
    RAISE NOTICE 'Test completed. Result: %', test_result::text;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test failed: %', SQLERRM;
END $$;

-- Step 6: Check for any remaining issues
SELECT 
    'Final Check' as status,
    'If you see debit_account_id error, the issue might be:
    1. Wrong function being called (check other functions)
    2. RLS policy blocking the update
    3. Trigger on accounts table interfering
    4. View being used instead of table' as recommendations;
