-- ============================================
-- FIX CREATE FISCAL YEAR FUNCTION
-- aligns INSERT statements with schema and populates created_by
-- ============================================

CREATE OR REPLACE FUNCTION public.create_fiscal_year(
  p_org_id uuid,
  p_year_number integer,
  p_start_date date,
  p_end_date date,
  p_user_id uuid DEFAULT auth.uid(),
  p_create_monthly_periods boolean DEFAULT true,
  p_name_en text DEFAULT NULL,
  p_name_ar text DEFAULT NULL,
  p_description_en text DEFAULT NULL,
  p_description_ar text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Use Security Definer to ensure permissions
SET search_path = public
AS $$
DECLARE
  v_fy_id uuid;
  v_cursor date;
  v_period_number integer := 0;
  v_period_start date;
  v_period_end date;
  v_name_en text;
  v_name_ar text;
BEGIN
  -- 1. Validation
  IF p_org_id IS NULL OR p_year_number IS NULL OR p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION 'Missing required parameters';
  END IF;

  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Start date must be before end date';
  END IF;

  -- 2. Check overlap (simple check)
  IF EXISTS (SELECT 1 FROM public.fiscal_years fy WHERE fy.org_id = p_org_id AND fy.year_number = p_year_number) THEN
    RAISE EXCEPTION 'Fiscal year % already exists for this organization', p_year_number;
  END IF;

  -- 3. Prepare Names
  v_name_en := COALESCE(p_name_en, 'FY ' || p_year_number::text); 
  v_name_ar := p_name_ar;

  -- 4. INSERT Fiscal Year (Including created_by)
  INSERT INTO public.fiscal_years (
    org_id, 
    year_number, 
    name_en, 
    name_ar, 
    description_en, 
    description_ar, 
    start_date, 
    end_date, 
    status, 
    is_current,
    created_by,
    updated_by
  )
  VALUES (
    p_org_id, 
    p_year_number, 
    v_name_en, 
    v_name_ar, 
    p_description_en, 
    p_description_ar, 
    p_start_date, 
    p_end_date, 
    'draft', 
    false,
    p_user_id,
    p_user_id
  )
  RETURNING id INTO v_fy_id;

  -- 5. Create Monthly Periods
  IF p_create_monthly_periods THEN
    v_cursor := date_trunc('month', p_start_date)::date;
    
    WHILE v_cursor <= p_end_date LOOP
      v_period_number := v_period_number + 1;
      
      -- Calculate period start/end (handle partial months at start/end of year)
      v_period_start := GREATEST(v_cursor, p_start_date);
      v_period_end := LEAST((v_cursor + INTERVAL '1 month - 1 day')::date, p_end_date);
      
      -- Skip if invalid range
      IF v_period_start > v_period_end THEN 
        v_cursor := (v_cursor + INTERVAL '1 month')::date; 
        CONTINUE; 
      END IF;

      -- INSERT Period (Including created_by)
      INSERT INTO public.fiscal_periods (
        org_id, 
        fiscal_year_id, 
        period_number, 
        period_code, 
        name_en, 
        name_ar, 
        description_en, 
        description_ar, 
        start_date, 
        end_date, 
        status, 
        is_current,
        created_by,
        updated_by
      )
      VALUES (
        p_org_id, 
        v_fy_id, 
        v_period_number, 
        to_char(v_period_start, 'YYYY-MM'), 
        'Period ' || v_period_number::text, 
        'فترة ' || v_period_number::text, -- Added rudimentary Arabic name
        NULL, 
        NULL, 
        v_period_start, 
        v_period_end, 
        'open', 
        false,
        p_user_id,
        p_user_id
      );

      v_cursor := (v_cursor + INTERVAL '1 month')::date;
    END LOOP;
  END IF;

  RETURN v_fy_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_fiscal_year TO authenticated;
