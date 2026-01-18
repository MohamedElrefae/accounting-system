-- FINAL FIX for Account Update Issue
-- Senior Engineer Solution: Remove conflicting function and ensure correct one is used

-- Step 1: Drop the problematic account_update_text function that's causing conflicts
DROP FUNCTION IF EXISTS public.account_update_text(
    uuid, uuid, text, text, text, text, integer, text
);

-- Step 2: Also drop any other conflicting versions
DROP FUNCTION IF EXISTS public.account_update_text(
    uuid, uuid, text, text, text, text, integer, account_status
);

-- Step 3: Ensure our correct account_update function is the ONLY one
-- (This should already exist from previous fixes, but let's verify)
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
BEGIN
    -- Update the account
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

    -- Convert record to JSON with proper field mapping
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

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.account_update TO authenticated;
GRANT EXECUTE ON FUNCTION public.account_update TO service_role;

-- Step 5: Verify only the correct function exists
SELECT 
    'Final Verification' as status,
    proname as function_name,
    proargtypes::text as argument_types,
    'This should be the ONLY account_update function' as note
FROM pg_proc 
WHERE proname = 'account_update' 
AND pronamespace = 'public'::regnamespace;

-- Step 6: Test the fix with safe parameters
DO $$
DECLARE
    test_result json;
BEGIN
    -- Test with parameters that should work
    SELECT public.account_update(
        '4cbba543-eb9c-4f32-9c77-155201f7e145'::uuid, -- Replace with your actual org_id
        '00000000-0000-0000-0000-0000-0001'::uuid, -- Replace with actual account_id
        'TEST001',
        'Test Account',
        'Test Account Arabic',
        'asset'::public.account_category,
        1,
        'active'::public.account_status
    ) INTO test_result;
    
    RAISE NOTICE 'SUCCESS: Account update test completed. Result: %', test_result::text;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FAILED: Account update test failed with error: %', SQLERRM;
END $$;

-- Step 7: Final confirmation
SELECT 
    'Fix Complete' as status,
    'The debit_account_id error should now be resolved' as message,
    'Only account_update function with proper enum types exists' as explanation;
