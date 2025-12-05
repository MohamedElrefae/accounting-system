-- ============================================================================
-- 075_fix_gl_summary_wrapper_v3.sql
-- Fix the get_gl_account_summary_filtered using transaction_lines table
-- ============================================================================

BEGIN;

-- Drop all existing versions
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered(
  date, date, text, text, boolean, integer, integer, text, text, text, text
);
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered(
  date, date, uuid, uuid, boolean, integer, integer, uuid, uuid, uuid, uuid
);

-- Create self-contained function using transaction_lines
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
  WITH 
  -- Convert text params to uuid
  params AS (
    SELECT
      CASE WHEN p_org_id IS NOT NULL AND p_org_id != '' THEN p_org_id::uuid ELSE NULL END AS org_id,
      CASE WHEN p_project_id IS NOT NULL AND p_project_id != '' THEN p_project_id::uuid ELSE NULL END AS project_id,
      CASE WHEN p_classification_id IS NOT NULL AND p_classification_id != '' THEN p_classification_id::uuid ELSE NULL END AS classification_id,
      CASE WHEN p_analysis_work_item_id IS NOT NULL AND p_analysis_work_item_id != '' THEN p_analysis_work_item_id::uuid ELSE NULL END AS analysis_work_item_id,
      CASE 
        WHEN p_sub_tree_id IS NOT NULL AND p_sub_tree_id != '' THEN p_sub_tree_id::uuid
        WHEN p_expenses_category_id IS NOT NULL AND p_expenses_category_id != '' THEN p_expenses_category_id::uuid
        ELSE NULL 
      END AS expenses_category_id
  ),
  -- Get line-level data from transaction_lines
  line_data AS (
    SELECT
      t.id AS transaction_id,
      t.entry_date,
      tl.account_id,
      COALESCE(tl.debit_amount, 0)::numeric AS debit,
      COALESCE(tl.credit_amount, 0)::numeric AS credit
    FROM public.transactions t
    JOIN public.transaction_lines tl ON tl.transaction_id = t.id
    CROSS JOIN params p
    WHERE TRUE
      AND (p.org_id IS NULL OR t.org_id = p.org_id)
      AND (p.project_id IS NULL OR COALESCE(tl.project_id, t.project_id) = p.project_id)
      AND (NOT COALESCE(p_posted_only, false) OR t.is_posted = TRUE)
      AND (p.classification_id IS NULL OR tl.classification_id = p.classification_id)
      AND (p.expenses_category_id IS NULL OR tl.sub_tree_id = p.expenses_category_id)
      AND (p.analysis_work_item_id IS NULL OR tl.analysis_work_item_id = p.analysis_work_item_id)
      AND (COALESCE(t.is_wizard_draft, false) = false)
  ),
  -- Split into opening (before date_from) and period (between dates)
  opening AS (
    SELECT
      ld.account_id,
      SUM(ld.debit) AS opening_debit,
      SUM(ld.credit) AS opening_credit
    FROM line_data ld
    WHERE p_date_from IS NOT NULL AND ld.entry_date < p_date_from
    GROUP BY ld.account_id
  ),
  period AS (
    SELECT
      ld.account_id,
      SUM(ld.debit) AS period_debits,
      SUM(ld.credit) AS period_credits,
      COUNT(DISTINCT ld.transaction_id) AS transaction_count
    FROM line_data ld
    WHERE (p_date_from IS NULL OR ld.entry_date >= p_date_from)
      AND (p_date_to IS NULL OR ld.entry_date <= p_date_to)
    GROUP BY ld.account_id
  ),
  -- Combine with accounts
  combined AS (
    SELECT
      a.id AS account_id,
      a.code AS account_code,
      a.name_ar AS account_name_ar,
      a.name AS account_name_en,
      COALESCE(o.opening_debit, 0) AS opening_debit,
      COALESCE(o.opening_credit, 0) AS opening_credit,
      COALESCE(p.period_debits, 0) AS period_debits,
      COALESCE(p.period_credits, 0) AS period_credits,
      COALESCE(p.transaction_count, 0) AS transaction_count
    FROM public.accounts a
    LEFT JOIN opening o ON o.account_id = a.id
    LEFT JOIN period p ON p.account_id = a.id
    WHERE (o.account_id IS NOT NULL OR p.account_id IS NOT NULL)
  ),
  -- Calculate totals
  with_totals AS (
    SELECT
      c.*,
      (c.opening_debit - c.opening_credit) AS opening_balance,
      (c.period_debits - c.period_credits) AS period_net,
      (c.opening_debit + c.period_debits) AS closing_debit,
      (c.opening_credit + c.period_credits) AS closing_credit,
      ((c.opening_debit - c.opening_credit) + (c.period_debits - c.period_credits)) AS closing_balance,
      COUNT(*) OVER() AS total_rows
    FROM combined c
  )
  SELECT
    wt.account_id,
    wt.account_code,
    wt.account_name_ar,
    wt.account_name_en,
    wt.opening_balance,
    wt.opening_debit,
    wt.opening_credit,
    wt.period_debits,
    wt.period_credits,
    wt.period_net,
    wt.closing_balance,
    wt.closing_debit,
    wt.closing_credit,
    wt.transaction_count,
    wt.total_rows
  FROM with_totals wt
  ORDER BY wt.account_code
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_gl_account_summary_filtered(
  date, date, text, text, boolean, integer, integer, text, text, text, text
) TO anon, authenticated, service_role;

COMMIT;
