-- Test queries for the updated GL functions with expenses_category_id support
-- Run these after creating the functions to verify they work

-- 1. First, check if the functions were created successfully
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('get_general_ledger_report_filtered', 'get_gl_account_summary_filtered')
ORDER BY p.proname;

-- 2. Get your organization ID for testing
SELECT id, name FROM organizations WHERE is_active = true LIMIT 5;

-- 3. Get some expenses categories for testing  
SELECT id, code, description 
FROM expenses_categories_full 
WHERE is_active = true 
LIMIT 5;

-- 4. Test get_general_ledger_report_filtered function (basic call)
-- Replace 'YOUR_ORG_ID' with an actual org ID from step 2
SELECT 
    entry_number,
    entry_date,
    account_code,
    account_name_ar,
    debit,
    credit
FROM get_general_ledger_report_filtered(
    p_org_id => 'YOUR_ORG_ID',
    p_limit => 5
)
LIMIT 5;

-- 5. Test get_gl_account_summary_filtered function (basic call)
-- Replace 'YOUR_ORG_ID' with an actual org ID from step 2
SELECT 
    account_code,
    account_name_ar,
    period_debits,
    period_credits,
    transaction_count
FROM get_gl_account_summary_filtered(
    p_org_id => 'YOUR_ORG_ID',
    p_limit => 5
)
LIMIT 5;

-- 6. Test expenses category filtering
-- Replace both 'YOUR_ORG_ID' and 'EXPENSES_CATEGORY_ID' with actual values
SELECT COUNT(*) as filtered_count
FROM get_general_ledger_report_filtered(
    p_org_id => 'YOUR_ORG_ID',
    p_expenses_category_id => 'EXPENSES_CATEGORY_ID',
    p_limit => 1000
);

-- 7. Compare filtered vs unfiltered results
WITH all_transactions AS (
    SELECT COUNT(*) as total_count
    FROM get_general_ledger_report_filtered(
        p_org_id => 'YOUR_ORG_ID',
        p_limit => 10000
    )
),
filtered_transactions AS (
    SELECT COUNT(*) as filtered_count  
    FROM get_general_ledger_report_filtered(
        p_org_id => 'YOUR_ORG_ID',
        p_expenses_category_id => 'EXPENSES_CATEGORY_ID',
        p_limit => 10000
    )
)
SELECT 
    all_transactions.total_count,
    filtered_transactions.filtered_count,
    CASE 
        WHEN filtered_transactions.filtered_count < all_transactions.total_count 
        THEN 'FILTER WORKING ✅'
        WHEN filtered_transactions.filtered_count = all_transactions.total_count
        THEN 'NO FILTERING EFFECT - Check if expenses category has transactions 🔍'
        ELSE 'UNEXPECTED RESULT ⚠️'
    END as filter_status
FROM all_transactions, filtered_transactions;