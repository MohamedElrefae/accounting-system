-- Fix Account Name Edit Issues and UI Data Reversion
-- Senior Engineer Solution: Fix database function and UI behavior

-- Step 1: Enhanced account_update function with better name handling
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
    v_current_name text;
    v_current_name_ar text;
BEGIN
    -- Add explicit validation for name fields
    IF p_org_id IS NULL THEN
        RAISE EXCEPTION 'Organization ID cannot be null';
    END IF;
    
    IF p_id IS NULL THEN
        RAISE EXCEPTION 'Account ID cannot be null';
    END IF;
    
    IF p_code IS NULL OR trim(p_code) = '' THEN
        RAISE EXCEPTION 'Account code cannot be empty';
    END IF;
    
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RAISE EXCEPTION 'Account name cannot be empty';
    END IF;
    
    -- Get current values for comparison (helps with debugging)
    SELECT name, name_ar INTO v_current_name, v_current_name_ar
    FROM public.accounts 
    WHERE id = p_id AND org_id = p_org_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account not found for ID: %, Org: %', p_id, p_org_id;
    END IF;
    
    -- Update account with enhanced error handling
    BEGIN
        UPDATE public.accounts 
        SET 
            code = p_code,
            name = p_name,
            name_ar = COALESCE(p_name_ar, p_name), -- Ensure name_ar is not null
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
            RAISE EXCEPTION 'Update failed - account not found or no permission';
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message;
        RAISE EXCEPTION 'Account update failed: % | Original: %/%s -> %/%s', 
            v_error_message, 
            v_current_name, v_current_name_ar,
            p_name, COALESCE(p_name_ar, p_name);
    END;
    
    -- Convert record to JSON with explicit field mapping
    result_json := json_build_object(
        'id', updated_account_record.id,
        'code', updated_account_record.code,
        'name', updated_account_record.name,
        'name_ar', updated_account_record.name_ar,
        'account_type', updated_account_account_record.category,
        'category', updated_account_record.category,
        'level', updated_account_record.level,
        'status', updated_account_record.status,
        'parent_id', updated_account_record.parent_id,
        'org_id', updated_account_record.org_id,
        'is_postable', updated_account_record.is_postable,
        'created_at', updated_account_record.created_at,
        'updated_at', updated_account_record.updated_at,
        'success', true,
        'message', 'Account updated successfully'
    );
    
    RETURN result_json;
END;
$$;

-- Step 2: Grant permissions
GRANT EXECUTE ON FUNCTION public.account_update TO authenticated;
GRANT EXECUTE ON FUNCTION public.account_update TO service_role;

-- Step 3: Create a function to get current account data without side effects
CREATE OR REPLACE FUNCTION public.get_account_for_edit(
    p_org_id uuid,
    p_account_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    account_record RECORD;
    result_json json;
BEGIN
    -- Get account data for editing without triggering any updates
    SELECT 
        id,
        org_id,
        code,
        name,
        name_ar,
        category,
        level,
        status,
        parent_id,
        is_postable,
        created_at,
        updated_at
    INTO account_record
    FROM public.accounts 
    WHERE id = p_account_id AND org_id = p_org_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account not found';
    END IF;
    
    -- Return clean data for form population
    result_json := json_build_object(
        'id', account_record.id,
        'org_id', account_record.org_id,
        'code', account_record.code,
        'name', account_record.name,
        'name_ar', account_record.name_ar,
        'category', account_record.category::text,
        'level', account_record.level,
        'status', account_record.status::text,
        'parent_id', account_record.parent_id,
        'is_postable', account_record.is_postable,
        'created_at', account_record.created_at,
        'updated_at', account_record.updated_at
    );
    
    RETURN result_json;
END;
$$;

-- Step 4: Grant permissions for get function
GRANT EXECUTE ON FUNCTION public.get_account_for_edit TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_for_edit TO service_role;

-- Step 5: Test the enhanced function
DO $$
DECLARE
    test_result json;
    v_error_message text;
BEGIN
    -- Test with safe parameters
    SELECT public.account_update(
        '4cbba543-eb9c-4f32-9c77-155201f7e145'::uuid, -- Replace with actual org_id
        '00000000-0000-0000-0000-0000-0001'::uuid, -- Replace with actual account_id
        'TEST-CODE-001',
        'Test Name Updated',
        'اسم اختبار محدث',
        'asset'::public.account_category,
        1,
        'active'::public.account_status
    ) INTO test_result;
    
    RAISE NOTICE 'SUCCESS: Enhanced account update test completed';
    RAISE NOTICE 'Result: %', test_result::text;
    
EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_message;
    RAISE NOTICE 'FAILED: Enhanced account update test failed: %', v_error_message;
END $$;

-- Step 6: Verify functions exist
SELECT 
    'Function Verification' as status,
    proname as function_name,
    proargtypes::text as argument_types,
    CASE 
        WHEN proname = 'account_update' THEN 'Main update function'
        WHEN proname = 'get_account_for_edit' THEN 'Read function for UI'
        ELSE 'Other'
    END as purpose
FROM pg_proc 
WHERE proname IN ('account_update', 'get_account_for_edit')
AND pronamespace = 'public'::regnamespace
ORDER BY proname;
