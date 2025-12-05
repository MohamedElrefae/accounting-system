-- ============================================================================
-- Check get_gl_account_summary_filtered RPC function
-- Run this in Supabase SQL Editor to verify the function exists and works
-- ============================================================================

-- Step 1: Check if function exists
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'get_gl_account_summary_filtered'
ORDER BY p.proname;

-- Step 2: Test the function with minimal parameters
SELECT 
  account_id,
  account_code,
  account_name_en,
  account_name_ar,
  opening_debit,
  opening_credit,
  period_debits,
  period_credits,
  closing_debit,
  closing_credit,
  transaction_count
FROM get_gl_account_summary_filtered(
  NULL,  -- p_date_from
  NULL,  -- p_date_to
  NULL,  -- p_org_id
  NULL,  -- p_project_id
  false, -- p_posted_only
  NULL,  -- p_limit
  NULL,  -- p_offset
  NULL,  -- p_classification_id
  NULL,  -- p_analysis_work_item_id
  NULL,  -- p_expenses_category_id
  NULL   -- p_sub_tree_id
)
LIMIT 10;

-- Step 3: Check totals by category
SELECT 
  CASE 
    WHEN account_code LIKE '1%' THEN 'assets'
    WHEN account_code LIKE '2%' THEN 'liabilities'
    WHEN account_code LIKE '3%' THEN 'equity'
    WHEN account_code LIKE '4%' THEN 'revenue'
    WHEN account_code LIKE '5%' THEN 'expenses'
    ELSE 'other'
  END as category,
  COUNT(*) as account_count,
  SUM(closing_debit) as total_closing_debit,
  SUM(closing_credit) as total_closing_credit,
  SUM(closing_debit + closing_credit) as display_amount
FROM get_gl_account_summary_filtered(
  NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL
)
GROUP BY 1
ORDER BY 1;
