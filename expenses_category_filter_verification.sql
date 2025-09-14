-- SQL Verification Queries for Expenses Category Filter in General Ledger

-- 1. Check available expenses categories for your organization
-- Replace 'YOUR_ORG_ID' with your actual organization ID
SELECT 
    id,
    code,
    description,
    is_active,
    created_at
FROM expenses_categories_full 
WHERE org_id = 'YOUR_ORG_ID' 
  AND is_active = true 
ORDER BY code;

-- 2. Test General Ledger filtering by expenses category
-- Replace 'YOUR_ORG_ID' and 'EXPENSES_CATEGORY_ID' with actual values
SELECT COUNT(*) as filtered_transactions
FROM get_general_ledger_report_filtered(
    account_id => NULL,
    date_from => NULL, 
    date_to => NULL,
    org_id => 'YOUR_ORG_ID',
    project_id => NULL,
    include_opening => true,
    posted_only => false,
    classification_id => NULL,
    analysis_work_item_id => NULL,
    expenses_category_id => 'EXPENSES_CATEGORY_ID',
    result_limit => 1000,
    result_offset => 0
);

-- 3. Compare results: All transactions vs. Filtered by expenses category
-- This should show different counts if the filter is working
WITH all_transactions AS (
    SELECT COUNT(*) as total_count
    FROM get_general_ledger_report_filtered(
        account_id => NULL,
        date_from => NULL, 
        date_to => NULL,
        org_id => 'YOUR_ORG_ID',
        project_id => NULL,
        include_opening => true,
        posted_only => false,
        classification_id => NULL,
        analysis_work_item_id => NULL,
        expenses_category_id => NULL,  -- No filter
        result_limit => 10000,
        result_offset => 0
    )
),
filtered_transactions AS (
    SELECT COUNT(*) as filtered_count
    FROM get_general_ledger_report_filtered(
        account_id => NULL,
        date_from => NULL, 
        date_to => NULL,
        org_id => 'YOUR_ORG_ID',
        project_id => NULL,
        include_opening => true,
        posted_only => false,
        classification_id => NULL,
        analysis_work_item_id => NULL,
        expenses_category_id => 'EXPENSES_CATEGORY_ID',  -- With filter
        result_limit => 10000,
        result_offset => 0
    )
)
SELECT 
    all_transactions.total_count,
    filtered_transactions.filtered_count,
    CASE 
        WHEN filtered_transactions.filtered_count < all_transactions.total_count 
        THEN 'FILTER WORKING ✅' 
        ELSE 'FILTER MAY NOT BE WORKING ⚠️'
    END as filter_status
FROM all_transactions, filtered_transactions;

-- 4. Test GL Account Summary with expenses category filter
-- Replace values as needed
SELECT 
    account_code,
    account_name_ar,
    account_name_en,
    period_debits,
    period_credits,
    transaction_count
FROM get_gl_account_summary_filtered(
    date_from => NULL,
    date_to => NULL,
    org_id => 'YOUR_ORG_ID',
    project_id => NULL,
    posted_only => false,
    classification_id => NULL,
    analysis_work_item_id => NULL,
    expenses_category_id => 'EXPENSES_CATEGORY_ID',
    result_limit => 100,
    result_offset => 0
)
WHERE transaction_count > 0
ORDER BY account_code;

-- 5. Verification query to ensure the expenses category exists and has related transactions
SELECT 
    ec.code as expenses_category_code,
    ec.description as expenses_category_name,
    COUNT(DISTINCT t.id) as related_transactions,
    SUM(CASE WHEN te.debit > 0 THEN te.debit ELSE 0 END) as total_debits,
    SUM(CASE WHEN te.credit > 0 THEN te.credit ELSE 0 END) as total_credits
FROM expenses_categories_full ec
LEFT JOIN transactions t ON t.expenses_category_id = ec.id
LEFT JOIN transaction_entries te ON te.transaction_id = t.id
WHERE ec.org_id = 'YOUR_ORG_ID' 
  AND ec.id = 'EXPENSES_CATEGORY_ID'
  AND ec.is_active = true
GROUP BY ec.code, ec.description;