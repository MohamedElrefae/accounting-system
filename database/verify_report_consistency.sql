-- ============================================================================
-- تحقق من تطابق الأرقام بين التقارير المالية
-- Verify Report Consistency - Dashboard vs Financial Reports
-- ============================================================================
-- 
-- هذا الاستعلام يتحقق من أن جميع التقارير تعرض نفس الأرقام
-- This query verifies that all reports show the same numbers
--
-- Run this after implementing the unified-financial-query service
-- ============================================================================

-- Step 1: Get totals from get_gl_account_summary_filtered
WITH gl_summary AS (
  SELECT 
    account_code,
    COALESCE(closing_debit, 0) as closing_debit,
    COALESCE(closing_credit, 0) as closing_credit,
    COALESCE(closing_debit, 0) + COALESCE(closing_credit, 0) as display_amount,
    CASE 
      WHEN account_code LIKE '1%' THEN 'assets'
      WHEN account_code LIKE '2%' THEN 'liabilities'
      WHEN account_code LIKE '3%' THEN 'equity'
      WHEN account_code LIKE '4%' THEN 'revenue'
      WHEN account_code LIKE '5%' THEN 'expenses'
      ELSE 'other'
    END as category
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
  WHERE COALESCE(closing_debit, 0) + COALESCE(closing_credit, 0) > 0
),

-- Step 2: Calculate category totals (Dashboard values)
category_totals AS (
  SELECT 
    category,
    SUM(display_amount) as total
  FROM gl_summary
  WHERE category != 'other'
  GROUP BY category
),

-- Step 3: Calculate Trial Balance totals
trial_balance AS (
  SELECT 
    SUM(closing_debit) as total_debit,
    SUM(closing_credit) as total_credit,
    ABS(SUM(closing_debit) - SUM(closing_credit)) < 0.01 as is_balanced
  FROM gl_summary
),

-- Step 4: Calculate Balance Sheet totals
balance_sheet AS (
  SELECT 
    SUM(CASE WHEN category = 'assets' THEN display_amount ELSE 0 END) as total_assets,
    SUM(CASE WHEN category = 'liabilities' THEN display_amount ELSE 0 END) as total_liabilities,
    SUM(CASE WHEN category = 'equity' THEN display_amount ELSE 0 END) as total_equity
  FROM gl_summary
  WHERE category IN ('assets', 'liabilities', 'equity')
),

-- Step 5: Calculate P&L totals
profit_loss AS (
  SELECT 
    SUM(CASE WHEN category = 'revenue' THEN display_amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN category = 'expenses' THEN display_amount ELSE 0 END) as total_expenses,
    SUM(CASE WHEN category = 'revenue' THEN display_amount ELSE 0 END) - 
    SUM(CASE WHEN category = 'expenses' THEN display_amount ELSE 0 END) as net_income
  FROM gl_summary
  WHERE category IN ('revenue', 'expenses')
)

-- Final Report
SELECT 
  '=== تقرير التحقق من تطابق الأرقام ===' as report_title,
  '' as separator
UNION ALL
SELECT 
  'Dashboard Category Totals:' as report_title,
  '' as separator
UNION ALL
SELECT 
  '  ' || category || ': ' || to_char(total, 'FM999,999,999.00') as report_title,
  '' as separator
FROM category_totals
ORDER BY category
UNION ALL
SELECT 
  '' as report_title,
  '' as separator
UNION ALL
SELECT 
  'Trial Balance:' as report_title,
  '' as separator
UNION ALL
SELECT 
  '  Total Debit: ' || to_char(total_debit, 'FM999,999,999.00') as report_title,
  '' as separator
FROM trial_balance
UNION ALL
SELECT 
  '  Total Credit: ' || to_char(total_credit, 'FM999,999,999.00') as report_title,
  '' as separator
FROM trial_balance
UNION ALL
SELECT 
  '  Is Balanced: ' || CASE WHEN is_balanced THEN '✅ YES' ELSE '❌ NO' END as report_title,
  '' as separator
FROM trial_balance
UNION ALL
SELECT 
  '' as report_title,
  '' as separator
UNION ALL
SELECT 
  'Balance Sheet:' as report_title,
  '' as separator
UNION ALL
SELECT 
  '  Total Assets: ' || to_char(total_assets, 'FM999,999,999.00') as report_title,
  '' as separator
FROM balance_sheet
UNION ALL
SELECT 
  '  Total Liabilities: ' || to_char(total_liabilities, 'FM999,999,999.00') as report_title,
  '' as separator
FROM balance_sheet
UNION ALL
SELECT 
  '  Total Equity: ' || to_char(total_equity, 'FM999,999,999.00') as report_title,
  '' as separator
FROM balance_sheet
UNION ALL
SELECT 
  '' as report_title,
  '' as separator
UNION ALL
SELECT 
  'Profit & Loss:' as report_title,
  '' as separator
UNION ALL
SELECT 
  '  Total Revenue: ' || to_char(total_revenue, 'FM999,999,999.00') as report_title,
  '' as separator
FROM profit_loss
UNION ALL
SELECT 
  '  Total Expenses: ' || to_char(total_expenses, 'FM999,999,999.00') as report_title,
  '' as separator
FROM profit_loss
UNION ALL
SELECT 
  '  Net Income: ' || to_char(net_income, 'FM999,999,999.00') as report_title,
  '' as separator
FROM profit_loss;

-- ============================================================================
-- Simplified verification query - returns single row with all totals
-- ============================================================================

SELECT 
  -- Dashboard totals
  (SELECT SUM(COALESCE(closing_debit, 0) + COALESCE(closing_credit, 0)) 
   FROM get_gl_account_summary_filtered(NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL)
   WHERE account_code LIKE '1%') as dashboard_assets,
  
  (SELECT SUM(COALESCE(closing_debit, 0) + COALESCE(closing_credit, 0)) 
   FROM get_gl_account_summary_filtered(NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL)
   WHERE account_code LIKE '2%') as dashboard_liabilities,
  
  (SELECT SUM(COALESCE(closing_debit, 0) + COALESCE(closing_credit, 0)) 
   FROM get_gl_account_summary_filtered(NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL)
   WHERE account_code LIKE '3%') as dashboard_equity,
  
  (SELECT SUM(COALESCE(closing_debit, 0) + COALESCE(closing_credit, 0)) 
   FROM get_gl_account_summary_filtered(NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL)
   WHERE account_code LIKE '4%') as dashboard_revenue,
  
  (SELECT SUM(COALESCE(closing_debit, 0) + COALESCE(closing_credit, 0)) 
   FROM get_gl_account_summary_filtered(NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL)
   WHERE account_code LIKE '5%') as dashboard_expenses,
  
  -- Trial Balance check
  (SELECT SUM(COALESCE(closing_debit, 0)) 
   FROM get_gl_account_summary_filtered(NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL)) as tb_total_debit,
  
  (SELECT SUM(COALESCE(closing_credit, 0)) 
   FROM get_gl_account_summary_filtered(NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL)) as tb_total_credit,
  
  -- Balance check
  (SELECT ABS(SUM(COALESCE(closing_debit, 0)) - SUM(COALESCE(closing_credit, 0))) < 0.01
   FROM get_gl_account_summary_filtered(NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL)) as is_balanced;
