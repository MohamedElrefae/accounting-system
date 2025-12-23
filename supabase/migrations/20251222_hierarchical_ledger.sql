-- Migration: Hierarchical Ledger Reporting
-- timestamp: 20251222_hierarchical_ledger.sql

-- 1. Function to get hierarchical ledger report
CREATE OR REPLACE FUNCTION public.get_hierarchical_ledger_report(
  p_subtree_id uuid,           -- The root node of the subtree (or single account)
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
  -- 1. Identify all accounts in the subtree
  WITH RECURSIVE account_tree AS (
    -- Anchor member: stringify uuid to match parent_id which might be inconsistent in some schemas, 
    -- but usually parent_id is uuid. specific schemas usually have parent_id as uuid.
    SELECT id FROM accounts WHERE id = p_subtree_id
    UNION ALL
    -- Recursive member
    SELECT a.id FROM accounts a
    JOIN account_tree t ON a.parent_id = t.id
  )
  SELECT array_agg(id) INTO v_subtree_accounts FROM account_tree;

  -- 2. Calculate aggregated opening balance for ALL accounts in the subtree
  --    (Only if p_include_opening is true, otherwise 0)
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
        p_subtree_id, -- Use p_subtree_id to leverage existing summary logic for opening balances
        p_cost_center_id
    );
  END IF;

  RETURN QUERY
  WITH filtered_transactions AS (
    SELECT 
      t.id as tx_id,
      t.date as tx_date,
      t.entry_number as tx_number,
      t.description as tx_desc,
      t.reference as tx_ref,
      tl.account_id as line_account_id,
      tl.debit_amount as line_debit,
      tl.credit_amount as line_credit,
      tl.org_id as line_org_id,
      tl.project_id as line_project_id,
      -- Get account details
      a.code as acc_code,
      a.name_ar as acc_name_ar,
      a.name as acc_name_en,
      count(*) OVER() as full_count
    FROM transactions t
    JOIN transaction_line_items tl ON t.id = tl.transaction_id
    JOIN accounts a ON tl.account_id = a.id
    WHERE 
      tl.account_id = ANY(v_subtree_accounts) -- Filter by subtree
      AND (p_org_id IS NULL OR t.org_id = p_org_id)
      AND (p_project_id IS NULL OR tl.project_id = p_project_id) -- Check line item project first ideally, or header
      AND (p_cost_center_id IS NULL OR tl.cost_center_id = p_cost_center_id)
      AND (p_date_from IS NULL OR t.date >= p_date_from)
      AND (p_date_to IS NULL OR t.date <= p_date_to)
      AND (NOT p_posted_only OR t.status = 'posted')
      -- Additional Filters
      AND (p_classification_id IS NULL OR tl.classification_id = p_classification_id)
      AND (p_analysis_work_item_id IS NULL OR tl.analysis_work_item_id = p_analysis_work_item_id)
      AND (p_expenses_category_id IS NULL OR tl.expenses_category_id = p_expenses_category_id)
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
    v_opening_balance, -- Report global opening balance on every row for context
    (v_opening_balance + cumulative_change) as running_balance,
    v_opening_debit,
    v_opening_credit,
    (v_opening_debit + cumulative_debit) as running_debit,
    (v_opening_credit + cumulative_credit) as running_credit,
    cumulative_change as period_total,
    (v_opening_balance + cumulative_change) as closing_balance, -- Same as running for last row
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
