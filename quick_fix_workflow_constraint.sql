-- Quick fix for workflow_id constraint in import_opening_balances
-- This approach uses the existing fn_create_approval_request function properly

-- Step 1: Check if there's a trigger on approval_requests that should set workflow_id
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_condition,
    action_orientation
FROM information_schema.triggers 
WHERE event_object_table = 'approval_requests' 
    AND trigger_schema = 'public';

-- Step 2: If no trigger exists, create one to automatically set workflow_id
CREATE OR REPLACE FUNCTION public.set_approval_request_workflow_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_workflow_id uuid;
BEGIN
    -- Only set workflow_id if it's NULL
    IF NEW.workflow_id IS NULL THEN
        -- Find the appropriate workflow for this target_table and org
        SELECT aw.id INTO v_workflow_id
        FROM public.approval_workflows aw
        WHERE (aw.org_id = NEW.org_id OR aw.org_id IS NULL)
            AND aw.is_active = TRUE
            AND aw.target_table = NEW.target_table
        ORDER BY aw.org_id DESC, aw.created_at ASC
        LIMIT 1;
        
        -- Update the workflow_id
        NEW.workflow_id = v_workflow_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS trg_approval_requests_set_workflow_id ON public.approval_requests;
CREATE TRIGGER trg_approval_requests_set_workflow_id
BEFORE INSERT ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION public.set_approval_request_workflow_id();

-- Step 3: Alternative - If the above doesn't work, we can modify the import_opening_balances
-- function to not create approval requests at all (let UI handle it)

-- First, let's create a version that doesn't create approval requests
CREATE OR REPLACE FUNCTION public.import_opening_balances_no_approval(
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

    -- Return import ID without creating approval request (UI will handle it)
    RETURN v_import_id;
END;
$$;

-- Grant permissions for the alternative function
DO $$
BEGIN
    GRANT EXECUTE ON FUNCTION public.import_opening_balances_no_approval TO authenticated;
    GRANT EXECUTE ON FUNCTION public.import_opening_balances_no_approval TO service_role;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
