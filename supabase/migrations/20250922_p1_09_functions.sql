-- Phase 1 / 09 - Core functions (initial versions before audit wiring)
SET search_path = public;

-- create_fiscal_year (initial version)
-- Note: in production, p1_11_function_audit_wiring.sql overwrites with audit calls
CREATE OR REPLACE FUNCTION public.create_fiscal_year(
  p_org_id uuid,
  p_year_number integer,
  p_start_date date,
  p_end_date date,
  p_user_id uuid DEFAULT public.fn_current_user_id(),
  p_create_monthly_periods boolean DEFAULT true,
  p_name_en text DEFAULT NULL,
  p_name_ar text DEFAULT NULL,
  p_description_en text DEFAULT NULL,
  p_description_ar text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_fy_id uuid;
  v_is_member boolean;
  v_can_manage boolean;
  v_cursor date;
  v_period_number integer := 0;
  v_period_start date;
  v_period_end date;
  v_name_en text;
  v_name_ar text;
BEGIN
  IF p_org_id IS NULL OR p_year_number IS NULL OR p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION 'Missing required parameters';
  END IF;
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'start_date (%) must be <= end_date (%)', p_start_date, p_end_date;
  END IF;
  v_is_member := public.fn_is_org_member(p_org_id, public.fn_current_user_id());
  v_can_manage := public.fn_can_manage_fiscal(p_org_id, public.fn_current_user_id());
  IF NOT v_is_member OR NOT v_can_manage THEN
    RAISE EXCEPTION 'Not authorized to create fiscal year for this organization';
  END IF;
  IF EXISTS (SELECT 1 FROM public.fiscal_years fy WHERE fy.org_id = p_org_id AND fy.year_number = p_year_number) THEN
    RAISE EXCEPTION 'Fiscal year % already exists for this organization', p_year_number;
  END IF;
  v_name_en := COALESCE(p_name_en, 'FY ' || p_year_number::text); v_name_ar := p_name_ar;
  INSERT INTO public.fiscal_years (org_id, year_number, name_en, name_ar, description_en, description_ar, start_date, end_date, status, is_current)
  VALUES (p_org_id, p_year_number, v_name_en, v_name_ar, p_description_en, p_description_ar, p_start_date, p_end_date, 'draft', false)
  RETURNING id INTO v_fy_id;
  IF p_create_monthly_periods THEN
    v_cursor := date_trunc('month', p_start_date)::date;
    WHILE v_cursor <= p_end_date LOOP
      v_period_number := v_period_number + 1;
      v_period_start := GREATEST(v_cursor, p_start_date);
      v_period_end := LEAST((v_cursor + INTERVAL '1 month - 1 day')::date, p_end_date);
      IF v_period_start > v_period_end THEN v_cursor := (v_cursor + INTERVAL '1 month')::date; CONTINUE; END IF;
      INSERT INTO public.fiscal_periods (org_id, fiscal_year_id, period_number, period_code, name_en, name_ar, description_en, description_ar, start_date, end_date, status, is_current)
      VALUES (p_org_id, v_fy_id, v_period_number, to_char(v_period_start,'YYYY-MM'), 'Period '||v_period_number::text, NULL, NULL, NULL, v_period_start, v_period_end, 'open', false);
      v_cursor := (v_cursor + INTERVAL '1 month')::date;
    END LOOP;
  END IF;
  RETURN v_fy_id;
END;
$$;

-- close_fiscal_period (initial version)
CREATE OR REPLACE FUNCTION public.close_fiscal_period(
  p_period_id uuid,
  p_user_id uuid DEFAULT public.fn_current_user_id(),
  p_closing_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_org_id uuid; v_status text; v_now timestamptz := now(); v_can_manage boolean; BEGIN
  IF p_period_id IS NULL THEN RAISE EXCEPTION 'p_period_id is required'; END IF;
  SELECT org_id, status INTO v_org_id, v_status FROM public.fiscal_periods WHERE id = p_period_id FOR UPDATE;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Fiscal period not found: %', p_period_id; END IF;
  v_can_manage := public.fn_can_manage_fiscal(v_org_id, public.fn_current_user_id());
  IF NOT v_can_manage THEN RAISE EXCEPTION 'Not authorized to close fiscal periods for this organization'; END IF;
  IF v_status NOT IN ('open','locked') THEN RAISE EXCEPTION 'Fiscal period % cannot be closed from status %', p_period_id, v_status; END IF;
  UPDATE public.fiscal_periods SET status='closed', closed_at=v_now, closed_by=p_user_id, closing_notes=COALESCE(p_closing_notes, closing_notes), updated_at=v_now WHERE id=p_period_id;
  UPDATE public.period_closing_checklists SET status='completed', updated_at=v_now WHERE fiscal_period_id=p_period_id AND status<>'completed' AND public.fn_can_manage_fiscal(org_id, public.fn_current_user_id());
  RETURN TRUE; END; $$;

-- validation (base)
CREATE OR REPLACE FUNCTION public.validate_opening_balances(p_org_id uuid, p_fiscal_year_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_is_member boolean; v_exists_year boolean; v_exists_rows boolean; v_tot_count bigint:=0; v_tot_sum numeric(20,4):=0; v_errors jsonb:='[]'::jsonb; v_warnings jsonb:='[]'::jsonb; v_by_account jsonb:='[]'::jsonb; v_by_project jsonb:='[]'::jsonb; v_by_cost_center jsonb:='[]'::jsonb; v_active_rules jsonb:='[]'::jsonb; BEGIN
  IF p_org_id IS NULL OR p_fiscal_year_id IS NULL THEN RETURN jsonb_build_object('ok',false,'errors',jsonb_build_array(jsonb_build_object('code','missing_params','message','org_id and fiscal_year_id are required'))); END IF;
  v_is_member := public.fn_is_org_member(p_org_id, public.fn_current_user_id()); IF NOT v_is_member THEN RETURN jsonb_build_object('ok',false,'errors',jsonb_build_array(jsonb_build_object('code','not_member','message','User is not a member of this organization'))); END IF;
  SELECT EXISTS (SELECT 1 FROM public.fiscal_years fy WHERE fy.id=p_fiscal_year_id AND fy.org_id=p_org_id) INTO v_exists_year; IF NOT v_exists_year THEN RETURN jsonb_build_object('ok',false,'errors',jsonb_build_array(jsonb_build_object('code','fiscal_year_missing','message','Fiscal year not found or does not belong to organization'))); END IF;
  SELECT EXISTS (SELECT 1 FROM public.opening_balances ob WHERE ob.org_id=p_org_id AND ob.fiscal_year_id=p_fiscal_year_id) INTO v_exists_rows; IF NOT v_exists_rows THEN RETURN jsonb_build_object('ok',true,'warnings',jsonb_build_array(jsonb_build_object('code','no_rows','message','No opening balances loaded for this fiscal year')),'totals',jsonb_build_object('count',0,'sum',0)); END IF;
  SELECT COUNT(*)::bigint, COALESCE(SUM(ob.amount),0) INTO v_tot_count, v_tot_sum FROM public.opening_balances ob WHERE ob.org_id=p_org_id AND ob.fiscal_year_id=p_fiscal_year_id;
  v_warnings := v_warnings || COALESCE((SELECT jsonb_agg(x) FROM (SELECT jsonb_build_object('code','negative_amount','message','Negative amount detected','row', jsonb_build_object('account_id',ob.account_id,'project_id',ob.project_id,'cost_center_id',ob.cost_center_id,'amount',ob.amount)) AS x FROM public.opening_balances ob WHERE ob.org_id=p_org_id AND ob.fiscal_year_id=p_fiscal_year_id AND ob.amount < 0 LIMIT 50) t),'[]'::jsonb);
  v_warnings := v_warnings || COALESCE((SELECT jsonb_agg(x) FROM (SELECT jsonb_build_object('code','zero_amount','message','Zero amount detected','row', jsonb_build_object('account_id',ob.account_id,'project_id',ob.project_id,'cost_center_id',ob.cost_center_id,'amount',ob.amount)) AS x FROM public.opening_balances ob WHERE ob.org_id=p_org_id AND ob.fiscal_year_id=p_fiscal_year_id AND ob.amount = 0 LIMIT 50) t),'[]'::jsonb);
  v_by_account := COALESCE((SELECT jsonb_agg(jsonb_build_object('account_id',account_id,'total',total)) FROM (SELECT ob.account_id, COALESCE(SUM(ob.amount),0) AS total FROM public.opening_balances ob WHERE ob.org_id=p_org_id AND ob.fiscal_year_id=p_fiscal_year_id GROUP BY ob.account_id ORDER BY ob.account_id) s),'[]'::jsonb);
  v_by_project := COALESCE((SELECT jsonb_agg(jsonb_build_object('project_id',project_id,'total',total)) FROM (SELECT ob.project_id, COALESCE(SUM(ob.amount),0) AS total FROM public.opening_balances ob WHERE ob.org_id=p_org_id AND ob.fiscal_year_id=p_fiscal_year_id GROUP BY ob.project_id ORDER BY ob.project_id) s),'[]'::jsonb);
  v_by_cost_center := COALESCE((SELECT jsonb_agg(jsonb_build_object('cost_center_id',cost_center_id,'total',total)) FROM (SELECT ob.cost_center_id, COALESCE(SUM(ob.amount),0) AS total FROM public.opening_balances ob WHERE ob.org_id=p_org_id AND ob.fiscal_year_id=p_fiscal_year_id GROUP BY ob.cost_center_id ORDER BY ob.cost_center_id) s),'[]'::jsonb);
  v_active_rules := COALESCE((SELECT jsonb_agg(jsonb_build_object('id',r.id,'rule_code',r.rule_code,'name_en',r.name_en,'name_ar',r.name_ar,'severity',r.severity,'active',r.active)) FROM public.opening_balance_validation_rules r WHERE r.org_id=p_org_id AND r.active=true),'[]'::jsonb);
  RETURN jsonb_build_object('ok', (jsonb_array_length(v_errors)=0), 'errors', v_errors, 'warnings', v_warnings, 'totals', jsonb_build_object('count',v_tot_count,'sum',v_tot_sum), 'by_account', v_by_account, 'by_project', v_by_project, 'by_cost_center', v_by_cost_center, 'active_rules', v_active_rules);
END; $$;

-- validate_construction_opening_balances (initial)
CREATE OR REPLACE FUNCTION public.validate_construction_opening_balances(p_org_id uuid, p_fiscal_year_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_base jsonb; v_errors jsonb:='[]'::jsonb; v_warnings jsonb:='[]'::jsonb; BEGIN
  v_base := public.validate_opening_balances(p_org_id, p_fiscal_year_id);
  IF COALESCE((v_base->>'ok')::boolean,false) = false AND jsonb_array_length(COALESCE(v_base->'errors','[]'::jsonb))>0 THEN
    RETURN jsonb_build_object('ok', false, 'errors', COALESCE(v_base->'errors','[]'::jsonb), 'warnings', COALESCE(v_base->'warnings','[]'::jsonb), 'base', v_base);
  END IF;
  RETURN jsonb_build_object('ok', true, 'errors', v_errors, 'warnings', (COALESCE(v_base->'warnings','[]'::jsonb) || v_warnings), 'base', v_base);
END; $$;

-- import_opening_balances (initial version)
CREATE OR REPLACE FUNCTION public.import_opening_balances(
  p_org_id uuid,
  p_fiscal_year_id uuid,
  p_import_data jsonb,
  p_user_id uuid DEFAULT public.fn_current_user_id(),
  p_source text DEFAULT 'excel',
  p_source_file_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_is_member boolean; v_can_manage boolean; v_import_id uuid; v_total int:=0; v_success int:=0; v_failed int:=0; v_errors jsonb:='[]'::jsonb; r jsonb; v_account_id uuid; v_project_id uuid; v_cost_center_id uuid; v_amount numeric(20,4); v_currency_code text; v_account_code text; v_project_code text; v_cost_center_code text; BEGIN
  IF p_org_id IS NULL OR p_fiscal_year_id IS NULL OR p_import_data IS NULL OR jsonb_typeof(p_import_data) <> 'array' THEN RAISE EXCEPTION 'Invalid parameters: org_id, fiscal_year_id, and array p_import_data are required'; END IF;
  v_is_member := public.fn_is_org_member(p_org_id, public.fn_current_user_id()); v_can_manage := public.fn_can_manage_fiscal(p_org_id, public.fn_current_user_id()); IF NOT (v_is_member AND v_can_manage) THEN RAISE EXCEPTION 'Not authorized to import opening balances for this organization'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.fiscal_years fy WHERE fy.id = p_fiscal_year_id AND fy.org_id = p_org_id) THEN RAISE EXCEPTION 'Fiscal year does not belong to organization'; END IF;
  INSERT INTO public.opening_balance_imports (org_id, fiscal_year_id, source, source_file_url, metadata, status, total_rows, success_rows, failed_rows, error_report) VALUES (p_org_id, p_fiscal_year_id, COALESCE(p_source,'excel'), p_source_file_url, '{}'::jsonb, 'processing', 0, 0, 0, '[]'::jsonb) RETURNING id INTO v_import_id;
  FOR r IN SELECT jsonb_array_elements(p_import_data) LOOP
    v_total := v_total + 1;
    v_account_id := (r->>'account_id')::uuid; v_project_id := CASE WHEN coalesce(r->>'project_id','')='' THEN NULL ELSE (r->>'project_id')::uuid END; v_cost_center_id := CASE WHEN coalesce(r->>'cost_center_id','')='' THEN NULL ELSE (r->>'cost_center_id')::uuid END; v_currency_code := NULLIF(r->>'currency_code',''); v_amount := NULLIF(r->>'amount','')::numeric; v_account_code := NULLIF(r->>'account_code',''); v_project_code := NULLIF(r->>'project_code',''); v_cost_center_code := NULLIF(r->>'cost_center_code','');
    IF v_amount IS NULL THEN v_failed := v_failed + 1; v_errors := v_errors || jsonb_build_array(jsonb_build_object('row_number', v_total,'code','missing_amount','message','amount is required')); CONTINUE; END IF;
    IF v_account_id IS NULL THEN
      IF v_account_code IS NULL THEN v_failed := v_failed + 1; v_errors := v_errors || jsonb_build_array(jsonb_build_object('row_number', v_total,'code','missing_account','message','account_id or account_code is required')); CONTINUE; ELSE
        SELECT a.id INTO v_account_id FROM public.accounts a WHERE a.org_id = p_org_id AND a.code = v_account_code LIMIT 1;
        IF v_account_id IS NULL THEN v_failed := v_failed + 1; v_errors := v_errors || jsonb_build_array(jsonb_build_object('row_number', v_total,'code','account_not_found','message','No account found for provided code','account_code', v_account_code)); CONTINUE; END IF;
      END IF;
    END IF;
    IF v_project_id IS NULL AND v_project_code IS NOT NULL THEN SELECT p.id INTO v_project_id FROM public.projects p WHERE (p.org_id = p_org_id OR p.org_id IS NULL) AND p.code = v_project_code LIMIT 1; END IF;
    IF v_cost_center_id IS NULL AND v_cost_center_code IS NOT NULL THEN SELECT c.id INTO v_cost_center_id FROM public.cost_centers c WHERE c.org_id = p_org_id AND c.code = v_cost_center_code LIMIT 1; END IF;
    BEGIN
      INSERT INTO public.opening_balances (org_id, fiscal_year_id, account_id, project_id, cost_center_id, amount, currency_code, import_id)
      VALUES (p_org_id, p_fiscal_year_id, v_account_id, v_project_id, v_cost_center_id, v_amount, v_currency_code, v_import_id)
      ON CONFLICT (org_id, fiscal_year_id, account_id, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(cost_center_id, '00000000-0000-0000-0000-000000000000'::uuid))
      DO UPDATE SET amount=EXCLUDED.amount, currency_code=EXCLUDED.currency_code, import_id=v_import_id, updated_at=now();
      v_success := v_success + 1;
    EXCEPTION WHEN others THEN v_failed := v_failed + 1; v_errors := v_errors || jsonb_build_array(jsonb_build_object('row_number', v_total,'code','upsert_failed','message', SQLERRM)); END;
  END LOOP;
  UPDATE public.opening_balance_imports SET total_rows=v_total, success_rows=v_success, failed_rows=v_failed, error_report=v_errors, status = CASE WHEN v_total=0 THEN 'completed' WHEN v_failed=0 THEN 'completed' WHEN v_success=0 THEN 'failed' ELSE 'partially_completed' END, updated_at=now() WHERE id=v_import_id;
  RETURN v_import_id;
END; $$;