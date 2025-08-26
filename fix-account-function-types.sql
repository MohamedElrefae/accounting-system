-- Fix for account_insert_child function type ambiguity
-- This script ensures we have a single, clear function signature

-- First, let's check what functions currently exist
-- Run this in Supabase SQL Editor to see current overloads:
SELECT 
    p.proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments,
    pg_catalog.pg_get_function_result(p.oid) as return_type
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'account_insert_child'
AND n.nspname = 'public';

-- Drop all existing overloads of account_insert_child to clean up
DROP FUNCTION IF EXISTS public.account_insert_child(uuid, uuid, text, text, text, public.account_category, integer, public.account_status);
DROP FUNCTION IF EXISTS public.account_insert_child(uuid, uuid, text, text, text, text, integer, public.account_status);
DROP FUNCTION IF EXISTS public.account_insert_child(uuid, uuid, text, text, text, text, integer, text);

-- Create a single, well-defined function that accepts enum types
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
    new_account json;
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
        status
    )
    VALUES (
        p_org_id,
        p_parent_id,
        p_code,
        p_name,
        p_name_ar,
        p_account_type,
        p_level,
        p_status
    )
    RETURNING 
        id,
        code,
        name,
        name_ar,
        category as account_type,
        level,
        status,
        parent_id,
        org_id
    INTO new_account;

    RETURN row_to_json(new_account);
END;
$$;

-- Similarly, let's also fix account_update if it has the same issue
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
    updated_account json;
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
        updated_at = now()
    WHERE id = p_id AND org_id = p_org_id
    RETURNING 
        id,
        code,
        name,
        name_ar,
        category as account_type,
        level,
        status,
        parent_id,
        org_id
    INTO updated_account;

    RETURN row_to_json(updated_account);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.account_insert_child TO authenticated;
GRANT EXECUTE ON FUNCTION public.account_update TO authenticated;
