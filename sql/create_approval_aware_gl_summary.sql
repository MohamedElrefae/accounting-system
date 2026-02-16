-- ============================================================================
-- Approval-Aware GL Summary Function
-- ============================================================================
-- This function integrates with the existing transaction_approvals table
-- to provide dynamic approval status filtering for financial reports.
--
-- IMPORTANT: This syncs with the approval engine used in the unified filter bar
-- and does NOT use hardcoded status values.
--
-- Approval Status Values (from transaction_approvals table):
--   - 'pending': Transaction submitted and awaiting approval
--   - 'approved': Transaction approved by authorized user
--   - 'rejected': Transaction rejected
--   - NULL: No approval record (draft transactions)
--
-- Usage:
--   - Pass NULL for p_approval_status to show ALL transactions
--   - Pass 'pending', 'approved', or 'rejected' to filter by approval status
--   - Pass 'draft' to show only transactions without approval records
-- ============================================================================

BEGIN;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered CASCADE;

-- Create enhanced function with approval status support
CREATE OR REPLACE FUNCTION public.get_gl_account_summary_filtered(
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_org_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_posted_only boolean DEFAULT false,
  p_limit integer DEFAULT NULL,
  p_offset integer DEFAULT NULL,
  p_approval_status text DEFAULT NULL,  -- NEW: 'draft', 'submitted', 'approved', 'rejected', 'revision_requested', or NULL for all
  p_classification_id uuid DEFAULT NULL,
  p_analysis_work_item_id uuid DEFAULT NULL,
  p_expenses_category_id uuid DEFAULT NULL,
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
    -- Join transaction_lines with transactions and transaction_approvals
    -- Filter by approval status from transaction_approvals table (dynamic integration)
    SELECT
      tl.transaction_id,
      t.entry_date,
      tl.org_id,
      COALESCE(tl.project_id, t.project_id) as project_id,
      tl.account_id,
      COALESCE(tl.debit_amount, 0)::numeric AS debit,
      COALESCE(tl.credit_amount, 0)::numeric AS credit,
      (COALESCE(tl.debit_amount, 0)::numeric - COALESCE(tl.credit_amount, 0)::numeric) AS signed_amount,
      t.is_posted,
      ta.approval_status
    FROM public.transaction_lines tl
    JOIN public.transactions t ON tl.transaction_id = t.id
    LEFT JOIN public.transaction_approvals ta ON t.id = ta.transaction_id
    WHERE TRUE
      AND (p_org_id IS NULL OR tl.org_id = p_org_id)
      AND (p_project_id IS NULL OR COALESCE(tl.project_id, t.project_id) = p_project_id)
      AND (NOT p_posted_only OR t.is_posted = TRUE)
      -- Approval status filter logic:
      -- NULL = show all transactions
      -- 'draft' = show transactions without approval records (ta.approval_status IS NULL)
      -- 'pending', 'approved', 'rejected' = show transactions with matching approval status
      AND (
        p_approval_status IS NULL 
        OR (p_approval_status = 'draft' AND ta.approval_status IS NULL)
        OR (p_approval_status != 'draft' AND ta.approval_status = p_approval_status)
      )
      AND tl.account_id IS NOT NULL
      AND (p_classification_id IS NULL OR tl.classification_id = p_classification_id)
      AND (p_analysis_work_item_id IS NULL OR tl.analysis_work_item_id = p_analysis_work_item_id)
      AND (p_expenses_category_id IS NULL OR tl.expenses_category_id = p_expenses_category_id)
      AND (p_sub_tree_id IS NULL OR tl.sub_tree_id = p_sub_tree_id)
  ),
  opening AS (
    -- Calculate opening balance (transactions BEFORE date_from)
    SELECT
      t.account_id,
      SUM(t.signed_amount)::numeric AS opening_balance
    FROM tx_expanded t
    WHERE p_date_from IS NOT NULL
      AND t.entry_date < p_date_from
    GROUP BY t.account_id
  ),
  period AS (
    -- Calculate period activity (transactions BETWEEN dates)
    SELECT
      t.account_id,
      SUM(t.debit)::numeric AS period_debits,
      SUM(t.credit)::numeric AS period_credits,
      SUM(t.signed_amount)::numeric AS period_net,
      COUNT(DISTINCT t.transaction_id)::bigint AS transaction_count
    FROM tx_expanded t
    WHERE (p_date_from IS NULL OR t.entry_date >= p_date_from)
      AND (p_date_to IS NULL OR t.entry_date <= p_date_to)
    GROUP BY t.account_id
  ),
  combined AS (
    -- Combine opening and period data
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
    LEFT JOIN period p ON p.account_id = a.id
    WHERE (p_org_id IS NULL OR a.org_id = p_org_id)
  ),
  with_totals AS (
    -- Calculate closing balance
    SELECT
      c.*,
      (c.opening_balance + c.period_net)::numeric AS closing_balance
    FROM combined c
  ),
  shaped AS (
    -- Convert signed amounts to debit/credit format
    SELECT
      wt.*,
      CASE WHEN wt.opening_balance > 0 THEN wt.opening_balance ELSE 0 END AS opening_debit,
      CASE WHEN wt.opening_balance < 0 THEN abs(wt.opening_balance) ELSE 0 END AS opening_credit,
      CASE WHEN wt.closing_balance > 0 THEN wt.closing_balance ELSE 0 END AS closing_debit,
      CASE WHEN wt.closing_balance < 0 THEN abs(wt.closing_balance) ELSE 0 END AS closing_credit
    FROM with_totals wt
  ),
  numbered AS (
    -- Add row numbers for pagination
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_gl_account_summary_filtered(
  date, date, uuid, uuid, boolean, integer, integer, text, uuid, uuid, uuid, uuid
) TO anon, authenticated, service_role;

-- Verify function was created
SELECT 
  'Approval-aware GL summary function created successfully' as status,
  routine_name,
  routine_type,
  pg_get_function_identity_arguments(p.oid) as parameters
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
WHERE routine_name = 'get_gl_account_summary_filtered'
AND routine_schema = 'public';

COMMIT;

-- ============================================================================
-- Test the function with different approval statuses
-- ============================================================================

-- Test 1: All transactions (no approval filter)
SELECT 'Test 1: All transactions' as test_name;
SELECT 
  COUNT(*) as account_count,
  SUM(period_debits) as total_period_debit,
  SUM(period_credits) as total_period_credit,
  SUM(closing_debit) as total_closing_debit,
  SUM(closing_credit) as total_closing_credit
FROM get_gl_account_summary_filtered(
  p_date_from := NULL,
  p_date_to := NULL,
  p_org_id := NULL,
  p_project_id := NULL,
  p_posted_only := false,
  p_approval_status := NULL  -- All transactions
);

-- Test 2: Approved transactions only
SELECT 'Test 2: Approved transactions only' as test_name;
SELECT 
  COUNT(*) as account_count,
  SUM(period_debits) as total_period_debit,
  SUM(period_credits) as total_period_credit,
  SUM(closing_debit) as total_closing_debit,
  SUM(closing_credit) as total_closing_credit
FROM get_gl_account_summary_filtered(
  p_date_from := NULL,
  p_date_to := NULL,
  p_org_id := NULL,
  p_project_id := NULL,
  p_posted_only := false,
  p_approval_status := 'approved'  -- Approved only
);

-- Test 3: Draft transactions only (no approval record)
SELECT 'Test 3: Draft transactions only' as test_name;
SELECT 
  COUNT(*) as account_count,
  SUM(period_debits) as total_period_debit,
  SUM(period_credits) as total_period_credit,
  SUM(closing_debit) as total_closing_debit,
  SUM(closing_credit) as total_closing_credit
FROM get_gl_account_summary_filtered(
  p_date_from := NULL,
  p_date_to := NULL,
  p_org_id := NULL,
  p_project_id := NULL,
  p_posted_only := false,
  p_approval_status := 'draft'  -- Draft only
);

-- Test 4: Pending approval transactions
SELECT 'Test 4: Pending approval transactions' as test_name;
SELECT 
  COUNT(*) as account_count,
  SUM(period_debits) as total_period_debit,
  SUM(period_credits) as total_period_credit,
  SUM(closing_debit) as total_closing_debit,
  SUM(closing_credit) as total_closing_credit
FROM get_gl_account_summary_filtered(
  p_date_from := NULL,
  p_date_to := NULL,
  p_org_id := NULL,
  p_project_id := NULL,
  p_posted_only := false,
  p_approval_status := 'pending'  -- Pending only
);

-- Test 5: Date range filtering (verify dates work correctly)
SELECT 'Test 5: Date range filtering' as test_name;
SELECT 
  COUNT(*) as account_count,
  SUM(period_debits) as total_period_debit,
  SUM(period_credits) as total_period_credit,
  SUM(closing_debit) as total_closing_debit,
  SUM(closing_credit) as total_closing_credit
FROM get_gl_account_summary_filtered(
  p_date_from := '2025-01-01',
  p_date_to := '2025-12-31',
  p_org_id := NULL,
  p_project_id := NULL,
  p_posted_only := false,
  p_approval_status := NULL
);

-- Diagnostic query: Check approval status distribution
SELECT 'Approval Status Distribution' as diagnostic;
SELECT 
  COALESCE(ta.approval_status, 'draft') as status,
  COUNT(DISTINCT t.id) as transaction_count,
  COUNT(tl.id) as line_count,
  SUM(COALESCE(tl.debit_amount, 0)) as total_debit,
  SUM(COALESCE(tl.credit_amount, 0)) as total_credit
FROM transactions t
JOIN transaction_lines tl ON t.id = tl.transaction_id
LEFT JOIN transaction_approvals ta ON t.id = ta.transaction_id
GROUP BY COALESCE(ta.approval_status, 'draft')
ORDER BY status;
