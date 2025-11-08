-- ==========================================
-- Supabase RPC Function: create_transaction_with_lines
-- ==========================================
-- This function atomically creates a transaction header and its associated lines
-- Usage: Call via supabase.rpc('create_transaction_with_lines', { header_data: {...}, lines_data: [...] })
-- ==========================================

CREATE OR REPLACE FUNCTION create_transaction_with_lines(
    header_data jsonb,
    lines_data jsonb
)
RETURNS uuid -- Returns the ID of the newly created transaction
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_transaction_id uuid;
    current_user_id uuid;
BEGIN
    -- Get current authenticated user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Insert the header data into the transactions table
    INSERT INTO public.transactions (
        entry_date,
        description,
        description_ar,
        org_id,
        project_id,
        classification_id,
        reference_number,
        notes,
        notes_ar,
        created_by,
        updated_by,
        created_at,
        updated_at
    )
    VALUES (
        (header_data->>'entry_date')::date,
        header_data->>'description',
        header_data->>'description_ar',
        (header_data->>'org_id')::uuid,
        NULLIF(header_data->>'project_id', '')::uuid,
        NULLIF(header_data->>'classification_id', '')::uuid,
        header_data->>'reference_number',
        header_data->>'notes',
        header_data->>'notes_ar',
        current_user_id,
        current_user_id,
        NOW(),
        NOW()
    )
    RETURNING id INTO new_transaction_id;

    -- Insert each line from the lines_data JSON array
    INSERT INTO public.transaction_lines (
        transaction_id,
        line_no,
        account_id,
        debit_amount,
        credit_amount,
        description,
        org_id,
        project_id,
        cost_center_id,
        work_item_id,
        analysis_work_item_id,
        classification_id,
        sub_tree_id,
        created_by,
        updated_by,
        created_at,
        updated_at
    )
    SELECT
        new_transaction_id,
        (line->>'line_no')::integer,
        (line->>'account_id')::uuid,
        COALESCE((line->>'debit_amount')::numeric, 0),
        COALESCE((line->>'credit_amount')::numeric, 0),
        line->>'description',
        COALESCE((line->>'org_id')::uuid, (header_data->>'org_id')::uuid),
        NULLIF(COALESCE(line->>'project_id', header_data->>'project_id'), '')::uuid,
        NULLIF(line->>'cost_center_id', '')::uuid,
        NULLIF(line->>'work_item_id', '')::uuid,
        NULLIF(line->>'analysis_work_item_id', '')::uuid,
        NULLIF(line->>'classification_id', '')::uuid,
        NULLIF(line->>'sub_tree_id', '')::uuid,
        current_user_id,
        current_user_id,
        NOW(),
        NOW()
    FROM jsonb_array_elements(lines_data) AS line;

    -- Return the new transaction ID
    RETURN new_transaction_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback happens automatically in PL/pgSQL
        RAISE EXCEPTION 'Failed to create transaction: %', SQLERRM;
END;
$$;

-- ==========================================
-- Grant necessary permissions
-- ==========================================
-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_transaction_with_lines(jsonb, jsonb) TO authenticated;

-- ==========================================
-- Verification SQL (to test after creation)
-- ==========================================
-- SELECT create_transaction_with_lines(
--     '{"entry_date": "2025-01-15", "description": "Test Transaction", "org_id": "YOUR-ORG-UUID"}'::jsonb,
--     '[
--         {"line_no": 1, "account_id": "YOUR-ACCOUNT-UUID", "debit_amount": 1000, "credit_amount": 0, "description": "Debit entry"},
--         {"line_no": 2, "account_id": "YOUR-ACCOUNT-UUID", "debit_amount": 0, "credit_amount": 1000, "description": "Credit entry"}
--     ]'::jsonb
-- );
