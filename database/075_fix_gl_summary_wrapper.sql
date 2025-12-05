-- ============================================================================
-- 075_fix_gl_summary_wrapper.sql
-- Fix the get_gl_account_summary_filtered wrapper to properly call the underlying function
-- ============================================================================

BEGIN;

-- Drop existing wrapper
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered(
  date, date, text, text, boolean, integer, integer, text, text, text, text
);

-- Create fixed wrapper that properly converts text to uuid and maps parameters correctly
CREATE OR REPLACE FUNCTION public.get_gl_account_summary_filtered(
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_org_id text DEFAULT NULL,
  p_project_id text DEFAULT NULL,
  p_posted_only boolean DEFAULT false,
  p_limit integer DEFAULT NULL,
  p_offset integer DEFAULT NULL,
  p_classification_id text DEFAULT NULL,
  p_analysis_work_item_id text DEFAULT NULL,
  p_expenses_category_id text DEFAULT NULL,
  p_sub_tree_id text DEFAULT NULL
)
RETURNS TABLE (
  account_id uuid,
  account_code text,
  account_name_ar text,
  account_name_en text,
  opening_balance numeric,
  opening_debit numeric,
  opening_credit numeric,
  period_debits numeric,
  period_credits numeric,
  period_net numeric,
  closing_balance numeric,
  closing_debit numeric,
  closing_credit numeric,
  transaction_count bigint,
  total_rows bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.get_gl_account_summary(
    p_date_from => p_date_from,
    p_date_to => p_date_to,
    p_org_id => CASE WHEN p_org_id IS NOT NULL AND p_org_id != '' THEN p_org_id::uuid ELSE NULL END,
    p_project_id => CASE WHEN p_project_id IS NOT NULL AND p_project_id != '' THEN p_project_id::uuid ELSE NULL END,
    p_posted_only => COALESCE(p_posted_only, false),
    p_limit => p_limit,
    p_offset => p_offset,
    p_classification_id => CASE WHEN p_classification_id IS NOT NULL AND p_classification_id != '' THEN p_classification_id::uuid ELSE NULL END,
    p_cost_center_id => NULL,
    p_work_item_id => NULL,
    p_expenses_category_id => CASE 
      WHEN p_sub_tree_id IS NOT NULL AND p_sub_tree_id != '' THEN p_sub_tree_id::uuid
      WHEN p_expenses_category_id IS NOT NULL AND p_expenses_category_id != '' THEN p_expenses_category_id::uuid
      ELSE NULL 
    END,
    p_debit_account_id => NULL,
    p_credit_account_id => NULL,
    p_amount_min => NULL,
    p_amount_max => NULL,
    p_analysis_work_item_id => CASE WHEN p_analysis_work_item_id IS NOT NULL AND p_analysis_work_item_id != '' THEN p_analysis_work_item_id::uuid ELSE NULL END
  );
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_gl_account_summary_filtered(
  date, date, text, text, boolean, integer, integer, text, text, text, text
) TO anon, authenticated, service_role;

COMMIT;

-- ============================================================================
-- VERIFICATION: Run this after the migration to verify it works
-- ============================================================================
-- SELECT 
--   account_code,
--   account_name_en,
--   closing_debit,
--   closing_credit
-- FROM get_gl_account_summary_filtered(
--   NULL,  -- p_date_from
--   NULL,  -- p_date_to
--   NULL,  -- p_org_id
--   NULL,  -- p_project_id
--   false, -- p_posted_only
--   10,    -- p_limit
--   NULL,  -- p_offset
--   NULL,  -- p_classification_id
--   NULL,  -- p_analysis_work_item_id
--   NULL,  -- p_expenses_category_id
--   NULL   -- p_sub_tree_id
-- );
