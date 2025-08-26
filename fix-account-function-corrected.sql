-- Corrected fix for account_insert_child function based on actual table structure
-- This script ensures we have a single, clear function signature that matches the accounts table

-- Drop all existing overloads of account_insert_child to clean up
DROP FUNCTION IF EXISTS public.account_insert_child(uuid, uuid, text, text, text, public.account_category, integer, public.account_status);
DROP FUNCTION IF EXISTS public.account_insert_child(uuid, uuid, text, text, text, text, integer, public.account_status);
DROP FUNCTION IF EXISTS public.account_insert_child(uuid, uuid, text, text, text, text, integer, text);

-- Create the corrected function that matches the actual table structure
CREATE OR REPLACE FUNCTION public.account_insert_child(
    p_org_id uuid,
    p_parent_id uuid,
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
AS $$
DECLARE
    new_account_record RECORD;
    result_json json;
BEGIN
    -- Insert the new account
    INSERT INTO public.accounts (
        org_id,
        parent_id,
        code,
        name,
        name_ar,
        category,
        level,
        status,
        is_postable,
        created_at,
        updated_at
    )
    VALUES (
        p_org_id,
        p_parent_id,
        p_code,
        p_name,
        p_name_ar,
        p_account_type,
        p_level,
        p_status,
        (p_level >= 3), -- Set is_postable based on level
        now(),
        now()
    )
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
    INTO new_account_record;

    -- Convert the record to JSON with proper field mapping
    result_json := json_build_object(
        'id', new_account_record.id,
        'code', new_account_record.code,
        'name', new_account_record.name,
        'name_ar', new_account_record.name_ar,
        'account_type', new_account_record.category,
        'category', new_account_record.category,
        'level', new_account_record.level,
        'status', new_account_record.status,
        'parent_id', new_account_record.parent_id,
        'org_id', new_account_record.org_id,
        'is_postable', new_account_record.is_postable,
        'created_at', new_account_record.created_at,
        'updated_at', new_account_record.updated_at
    );

    RETURN result_json;
END;
$$;

-- Similarly, fix account_update to match the actual table structure
DROP FUNCTION IF EXISTS public.account_update(uuid, uuid, text, text, text, public.account_category, integer, public.account_status);
DROP FUNCTION IF EXISTS public.account_update(uuid, uuid, text, text, text, text, integer, public.account_status);
DROP FUNCTION IF EXISTS public.account_update(uuid, uuid, text, text, text, text, integer, text);

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
        is_postable = (p_level >= 3), -- Update is_postable based on level
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

    -- Convert the record to JSON with proper field mapping
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.account_insert_child TO authenticated;
GRANT EXECUTE ON FUNCTION public.account_update TO authenticated;
