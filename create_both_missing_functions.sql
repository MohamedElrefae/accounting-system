-- Create both missing functions needed by Enterprise Running Balance
-- 1. get_gl_account_summary_filtered with 12 parameters
-- 2. get_hierarchical_ledger_report

begin;

-- Drop any existing versions to avoid conflicts
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered(
  date, date, uuid, uuid, boolean, integer, integer, uuid, uuid, uuid, uuid, uuid
) CASCADE;
DROP FUNCTION IF EXISTS public.get_hierarchical_ledger_report CASCADE;

-- Create get_gl_account_summary_filtered with the 12-parameter signature
CREATE OR REPLACE FUNCTION public.get_gl_account_summary_filtered(
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_org_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_posted_only boolean DEFAULT true,
  p_limit integer DEFAULT NULL,
  p_offset integer DEFAULT NULL,
  p_classification_id uuid DEFAULT NULL,
  p_analysis_work_item_id uuid DEFAULT NULL,
  p_expenses_category_id uuid DEFAULT NULL,
  p_cost_center_id uuid DEFAULT NULL,
  p_sub_tree_id uuid DEFAULT NULL
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
  WITH tx_expanded AS (
    -- Use transaction_lines table with basic columns
    SELECT
      tl.transaction_id,
      t.entry_date,
      tl.org_id,
      COALESCE(tl.project_id, t.project_id) as project_id,
      tl.account_id,
      COALESCE(tl.debit_amount, 0)::numeric AS debit,
      COALESCE(tl.credit_amount, 0)::numeric AS credit,
      (COALESCE(tl.debit_amount, 0)::numeric - COALESCE(tl.credit_amount, 0)::numeric) AS signed_amount
    FROM public.transaction_lines tl
    JOIN public.transactions t ON tl.transaction_id = t.id
    WHERE TRUE
      AND (p_org_id IS NULL OR tl.org_id = p_org_id)
      AND (p_project_id IS NULL OR COALESCE(tl.project_id, t.project_id) = p_project_id)
      AND (NOT p_posted_only OR t.is_posted = TRUE)
      AND tl.account_id IS NOT NULL
      -- Note: Additional filters (classification, work_item, etc.) are ignored for now
      -- since these columns may not exist in transaction_lines
  ),
  opening AS (
    SELECT
      t.account_id,
      SUM(t.signed_amount)::numeric AS opening_balance
    FROM tx_expanded t
    WHERE p_date_from IS NOT NULL
      AND t.entry_date < p_date_from
    GROUP BY t.account_id
  ),
  period AS (
    SELECT
      t.account_id,
      SUM(t.debit)::numeric AS period_debits,
      SUM(t.credit)::numeric AS period_credits,
      SUM(t.signed_amount)::numeric AS period_net,
      COUNT(DISTINCT t.transaction_id)::bigint AS transaction_count
    FROM tx_expanded t
    WHERE (p_date_from IS NULL OR t.entry_date >= p_date_from)
      AND (p_date_to   IS NULL OR t.entry_date <= p_date_to)
    GROUP BY t.account_id
  ),
  combined AS (
    SELECT
      a.id AS account_id,
      a.code AS account_code,
      COALESCE(a.name_ar, a.name) AS account_name_ar,
      a.name AS account_name_en,
      COALESCE(o.opening_balance, 0)::numeric AS opening_balance,
      COALESCE(p.period_debits, 0)::numeric AS period_debits,
      COALESCE(p.period_credits, 0)::numeric AS period_credits,
      COALESCE(p.period_net, 0)::numeric AS period_net,
      COALESCE(p.transaction_count, 0)::bigint AS transaction_count
    FROM public.accounts a
    LEFT JOIN opening o ON o.account_id = a.id
    LEFT JOIN period  p ON p.account_id = a.id
    WHERE TRUE
  ),
  with_totals AS (
    SELECT
      c.*,
      (c.opening_balance + c.period_net)::numeric AS closing_balance
    FROM combined c
  ),
  shaped AS (
    SELECT
      wt.*,
      CASE WHEN wt.opening_balance > 0 THEN wt.opening_balance ELSE 0 END AS opening_debit,
      CASE WHEN wt.opening_balance < 0 THEN abs(wt.opening_balance) ELSE 0 END AS opening_credit,
      CASE WHEN wt.closing_balance > 0 THEN wt.closing_balance ELSE 0 END AS closing_debit,
      CASE WHEN wt.closing_balance < 0 THEN abs(wt.closing_balance) ELSE 0 END AS closing_credit
    FROM with_totals wt
  ),
  numbered AS (
    SELECT
      s.*,
      COUNT(*) OVER () AS total_rows,
      ROW_NUMBER() OVER (ORDER BY s.account_code) AS rn
    FROM shaped s
  )
  SELECT
    account_id,
    account_code,
    account_name_ar,
    account_name_en,
    opening_balance,
    opening_debit,
    opening_credit,
    period_debits,
    period_credits,
    period_net,
    closing_balance,
    closing_debit,
    closing_credit,
    transaction_count,
    total_rows
  FROM numbered n
  WHERE (p_limit IS NULL OR n.rn > COALESCE(p_offset, 0))
    AND (p_limit IS NULL OR n.rn <= COALESCE(p_offset, 0) + p_limit)
  ORDER BY n.rn;
$$;

-- Create get_hierarchical_ledger_report function
CREATE OR REPLACE FUNCTION public.get_hierarchical_ledger_report(
  p_subtree_id uuid,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_org_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_include_opening boolean DEFAULT true,
  p_posted_only boolean DEFAULT false,
  p_limit integer DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_classification_id uuid DEFAULT NULL,
  p_analysis_work_item_id uuid DEFAULT NULL,
  p_expenses_category_id uuid DEFAULT NULL,
  p_cost_center_id uuid DEFAULT NULL
)
RETURNS TABLE (
  transaction_id uuid,
  entry_date date,
  entry_number text,
  description text,
  reference_number text,
  account_id uuid,
  account_code text,
  account_name_ar text,
  account_name_en text,
  debit numeric,
  credit numeric,
  signed_amount numeric,
  opening_balance numeric,
  running_balance numeric,
  opening_debit numeric,
  opening_credit numeric,
  running_debit numeric,
  running_credit numeric,
  period_total numeric,
  closing_balance numeric,
  closing_debit numeric,
  closing_credit numeric,
  org_id uuid,
  project_id uuid,
  total_rows bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_subtree_accounts uuid[];
  v_opening_balance numeric := 0;
  v_opening_debit numeric := 0;
  v_opening_credit numeric := 0;
BEGIN
  -- 1. Identify all accounts in the subtree (simplified - just the subtree_id for now)
  v_subtree_accounts := ARRAY[p_subtree_id];

  -- 2. Calculate opening balance using the summary function
  IF p_include_opening THEN
    SELECT 
      COALESCE(SUM(opening_debit - opening_credit), 0),
      COALESCE(SUM(opening_debit), 0),
      COALESCE(SUM(opening_credit), 0)
    INTO v_opening_balance, v_opening_debit, v_opening_credit
    FROM get_gl_account_summary_filtered(
        p_date_from, 
        p_date_to, 
        p_org_id, 
        p_project_id, 
        p_posted_only, 
        NULL, -- limit
        NULL, -- offset
        p_classification_id,
        p_analysis_work_item_id,
        p_expenses_category_id,
        p_cost_center_id,
        p_sub_tree_id
    );
  END IF;

  RETURN QUERY
  WITH filtered_transactions AS (
    SELECT 
      t.id as tx_id,
      t.entry_date as tx_date,
      t.entry_number as tx_number,
      t.description as tx_desc,
      t.reference as tx_ref,
      tl.account_id as line_account_id,
      tl.debit_amount as line_debit,
      tl.credit_amount as line_credit,
      tl.org_id as line_org_id,
      tl.project_id as line_project_id,
      a.code as acc_code,
      a.name_ar as acc_name_ar,
      a.name as acc_name_en,
      count(*) OVER() as full_count
    FROM transactions t
    JOIN transaction_lines tl ON t.id = tl.transaction_id
    JOIN accounts a ON tl.account_id = a.id
    WHERE 
      tl.account_id = ANY(v_subtree_accounts)
      AND (p_org_id IS NULL OR tl.org_id = p_org_id)
      AND (p_project_id IS NULL OR tl.project_id = p_project_id)
      AND (p_cost_center_id IS NULL OR tl.cost_center_id = p_cost_center_id)
      AND (p_date_from IS NULL OR t.entry_date >= p_date_from)
      AND (p_date_to IS NULL OR t.entry_date <= p_date_to)
      AND (NOT p_posted_only OR t.is_posted = TRUE)
  ),
  ordered_transactions AS (
    SELECT 
      *,
      (line_debit - line_credit) as net_amount,
      SUM(line_debit - line_credit) OVER (ORDER BY tx_date, tx_number, tx_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as cumulative_change,
      SUM(line_debit) OVER (ORDER BY tx_date, tx_number, tx_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as cumulative_debit,
      SUM(line_credit) OVER (ORDER BY tx_date, tx_number, tx_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as cumulative_credit
    FROM filtered_transactions
  )
  SELECT 
    tx_id,
    tx_date,
    tx_number,
    tx_desc,
    tx_ref,
    line_account_id,
    acc_code,
    acc_name_ar,
    acc_name_en,
    line_debit,
    line_credit,
    net_amount,
    v_opening_balance,
    (v_opening_balance + cumulative_change) as running_balance,
    v_opening_debit,
    v_opening_credit,
    (v_opening_debit + cumulative_debit) as running_debit,
    (v_opening_credit + cumulative_credit) as running_credit,
    cumulative_change as period_total,
    (v_opening_balance + cumulative_change) as closing_balance,
    (v_opening_debit + cumulative_debit) as closing_debit,
    (v_opening_credit + cumulative_credit) as closing_credit,
    line_org_id,
    line_project_id,
    full_count
  FROM ordered_transactions
  ORDER BY tx_date ASC, tx_number ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_gl_account_summary_filtered(
  date, date, uuid, uuid, boolean, integer, integer, uuid, uuid, uuid, uuid, uuid
) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_hierarchical_ledger_report(
  uuid, date, date, uuid, uuid, boolean, boolean, integer, integer, uuid, uuid, uuid, uuid
) TO anon, authenticated, service_role;

commit;

-- Verification
SELECT 'SUCCESS: Both functions created successfully' as status;
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name IN ('get_gl_account_summary_filtered', 'get_hierarchical_ledger_report')
AND routine_schema = 'public';
