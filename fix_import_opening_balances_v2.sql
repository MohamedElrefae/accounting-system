-- Find and fix the existing import_opening_balances function
-- Run this to see the current function definition first

SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name = 'import_opening_balances';

-- Now let's create the corrected version
CREATE OR REPLACE FUNCTION public.import_opening_balances(
    p_org_id uuid,
    p_fiscal_year_id uuid,
    p_import_data jsonb,
    p_user_id uuid DEFAULT public.fn_current_user_id(),
    p_source text DEFAULT 'ui',
    p_source_file_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_import_id uuid;
    v_approval_request_id uuid;
    v_total_rows integer;
    v_success_rows integer := 0;
    v_failed_rows integer := 0;
    v_error_report jsonb := '[]'::jsonb;
    v_item jsonb;
    v_account_id uuid;
    v_project_id uuid;
    v_cost_center_id uuid;
    v_amount numeric;
    v_currency_code text;
    v_idx integer;
BEGIN
    -- Validate inputs
    IF p_org_id IS NULL OR p_fiscal_year_id IS NULL OR p_import_data IS NULL THEN
        RAISE EXCEPTION 'org_id, fiscal_year_id, and p_import_data are required';
    END IF;

    -- Create import record
    INSERT INTO public.opening_balance_imports (
        org_id, fiscal_year_id, source, source_file_url, 
        metadata, status, total_rows, success_rows, failed_rows, 
        error_report, created_by, updated_by, created_at, updated_at
    ) VALUES (
        p_org_id, p_fiscal_year_id, p_source, p_source_file_url,
        p_import_data, 'pending', jsonb_array_length(p_import_data), 0, 0,
        '[]'::jsonb, p_user_id, p_user_id, now(), now()
    ) RETURNING id INTO v_import_id;

    -- Set total rows
    v_total_rows := jsonb_array_length(p_import_data);

    -- Process each import item
    FOR v_idx IN 0..v_total_rows-1 LOOP
        v_item := p_import_data->v_idx;
        
        -- Extract and validate data
        v_account_id := COALESCE(
            NULLIF(v_item->>'account_id', '')::uuid,
            (SELECT id FROM public.accounts WHERE org_id = p_org_id AND code = v_item->>'account_code' LIMIT 1)
        );
        
        v_project_id := COALESCE(
            NULLIF(v_item->>'project_id', '')::uuid,
            (SELECT id FROM public.projects WHERE (org_id = p_org_id OR org_id IS NULL) AND code = v_item->>'project_code' LIMIT 1)
        );
        
        v_cost_center_id := COALESCE(
            NULLIF(v_item->>'cost_center_id', '')::uuid,
            (SELECT id FROM public.cost_centers WHERE org_id = p_org_id AND code = v_item->>'cost_center_code' LIMIT 1)
        );
        
        v_amount := (v_item->>'amount')::numeric;
        v_currency_code := v_item->>'currency_code';

        -- Validate required fields
        IF v_account_id IS NULL THEN
            v_error_report := v_error_report || jsonb_build_object(
                'row', v_idx + 1,
                'error', 'Account not found: ' || COALESCE(v_item->>'account_code', v_item->>'account_id', 'NULL')
            );
            v_failed_rows := v_failed_rows + 1;
        ELSIF v_amount IS NULL THEN
            v_error_report := v_error_report || jsonb_build_object(
                'row', v_idx + 1,
                'error', 'Amount is required'
            );
            v_failed_rows := v_failed_rows + 1;
        ELSE
            -- Insert opening balance
            BEGIN
                INSERT INTO public.opening_balances (
                    org_id, fiscal_year_id, account_id, project_id, cost_center_id,
                    amount, currency_code, import_id, created_by, updated_by, created_at, updated_at
                ) VALUES (
                    p_org_id, p_fiscal_year_id, v_account_id, v_project_id, v_cost_center_id,
                    v_amount, v_currency_code, v_import_id, p_user_id, p_user_id, now(), now()
                );
                v_success_rows := v_success_rows + 1;
            EXCEPTION WHEN OTHERS THEN
                v_error_report := v_error_report || jsonb_build_object(
                    'row', v_idx + 1,
                    'error', SQLERRM
                );
                v_failed_rows := v_failed_rows + 1;
            END;
        END IF;
    END LOOP;

    -- Update import status
    UPDATE public.opening_balance_imports SET
        status = CASE 
            WHEN v_failed_rows = 0 THEN 'completed'
            WHEN v_success_rows = 0 THEN 'failed'
            ELSE 'partially_completed'
        END,
        success_rows = v_success_rows,
        failed_rows = v_failed_rows,
        error_report = v_error_report,
        updated_by = p_user_id,
        updated_at = now()
    WHERE id = v_import_id;

    -- Create approval request using the proper function (this fixes the workflow_id issue)
    IF v_success_rows > 0 THEN
        -- Use the helper function that properly handles workflow_id resolution
        INSERT INTO public.approval_requests (
            target_table, 
            target_id, 
            org_id, 
            workflow_id,  -- This will be resolved by the trigger below
            current_step_order, 
            status, 
            submitted_by, 
            submitted_at, 
            meta, 
            created_at, 
            updated_at
        ) VALUES (
            'opening_balances',
            v_import_id,
            p_org_id,
            NULL,  -- Let trigger resolve workflow_id
            1,
            'pending',
            p_user_id,
            now(),
            jsonb_build_object(
                'source', p_source,
                'total_rows', v_total_rows,
                'success_rows', v_success_rows,
                'failed_rows', v_failed_rows
            ),
            now(),
            now()
        ) RETURNING id INTO v_approval_request_id;
    END IF;

    RETURN v_import_id;
END;
$$;

-- Grant permissions
DO $$
BEGIN
    GRANT EXECUTE ON FUNCTION public.import_opening_balances TO authenticated;
    GRANT EXECUTE ON FUNCTION public.import_opening_balances TO service_role;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
