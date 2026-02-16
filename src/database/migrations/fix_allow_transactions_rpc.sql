-- Migration to fix allow_transactions not saving in RPCs
-- This updates account_update and account_insert_child to accept p_allow_transactions

-- 1. Drop existing account_update function to avoid ambiguity
DROP FUNCTION IF EXISTS public.account_update(uuid, uuid, text, text, text, public.account_category, integer, public.account_status);

-- 2. Create updated account_update RPC
CREATE OR REPLACE FUNCTION public.account_update(
    p_org_id uuid,
    p_id uuid,
    p_code text,
    p_name text,
    p_name_ar text,
    p_account_type public.account_category,
    p_level integer,
    p_status public.account_status,
    p_allow_transactions boolean DEFAULT NULL -- New parameter with default for backward compatibility
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_account_record RECORD;
    result_json json;
    v_allow_transactions boolean;
BEGIN
    -- Determine allow_transactions value
    -- If p_allow_transactions is provided, use it.
    -- If not (NULL), fallback to existing logic: level >= 3
    IF p_allow_transactions IS NOT NULL THEN
        v_allow_transactions := p_allow_transactions;
    ELSE
        -- Default logic if not provided (legacy behavior, though we prefer explicit)
        -- We'll just keep existing value if possible, or default based on level if new (but this is update)
        -- Actually for update, let's look up existing if NULL? No, let's just default to level check if not passed
        -- to match previous behavior of this function which forced is_postable based on level.
         v_allow_transactions := (p_level >= 3);
    END IF;

    -- Update the account
    UPDATE public.accounts 
    SET 
        code = p_code,
        name = p_name,
        name_ar = p_name_ar,
        category = p_account_type,
        level = p_level,
        status = p_status,
        allow_transactions = v_allow_transactions,
        is_postable = v_allow_transactions, -- Sync is_postable with allow_transactions
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
        allow_transactions,
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
        'allow_transactions', updated_account_record.allow_transactions,
        'is_postable', updated_account_record.is_postable,
        'created_at', updated_account_record.created_at,
        'updated_at', updated_account_record.updated_at
    );

    RETURN result_json;
END;
$$;

-- 3. Drop existing account_insert_child function to avoid ambiguity
DROP FUNCTION IF EXISTS public.account_insert_child(uuid, uuid, text, text, text, public.account_category, integer, public.account_status);

-- 4. Create updated account_insert_child RPC
CREATE OR REPLACE FUNCTION public.account_insert_child(
    p_org_id uuid,
    p_parent_id uuid,
    p_code text,
    p_name text,
    p_name_ar text,
    p_account_type public.account_category,
    p_level integer,
    p_status public.account_status,
    p_allow_transactions boolean DEFAULT NULL -- New parameter
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_account_record RECORD;
    result_json json;
    v_allow_transactions boolean;
BEGIN
    -- Logic for allow_transactions
    IF p_allow_transactions IS NOT NULL THEN
        v_allow_transactions := p_allow_transactions;
    ELSE
        v_allow_transactions := (p_level >= 3);
    END IF;

    INSERT INTO public.accounts (
        org_id,
        parent_id,
        code,
        name,
        name_ar,
        category,
        level,
        status,
        allow_transactions,
        is_postable,
        is_standard
    ) VALUES (
        p_org_id,
        p_parent_id,
        p_code,
        p_name,
        p_name_ar,
        p_account_type,
        p_level,
        p_status,
        v_allow_transactions,
        v_allow_transactions, -- Sync is_postable
        false
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
        allow_transactions,
        is_postable,
        created_at,
        updated_at
    INTO new_account_record;

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
        'allow_transactions', new_account_record.allow_transactions,
        'is_postable', new_account_record.is_postable,
        'created_at', new_account_record.created_at,
        'updated_at', new_account_record.updated_at
    );

    RETURN result_json;
END;
$$;

-- Grant permissions again just in case
GRANT EXECUTE ON FUNCTION public.account_update TO authenticated;
GRANT EXECUTE ON FUNCTION public.account_update TO service_role;
GRANT EXECUTE ON FUNCTION public.account_insert_child TO authenticated;
GRANT EXECUTE ON FUNCTION public.account_insert_child TO service_role;
