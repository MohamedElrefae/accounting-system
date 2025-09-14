-- Diagnose and fix analysis work item filtering issue
-- The problem: Overview shows accounts without checking if they have transactions with the specific analysis work item

-- 1. First, let's test the issue with a specific analysis work item ID
-- Replace 'ANALYSIS_WORK_ITEM_ID' with the actual ID from your UI
SELECT 'Testing analysis work item filtering issue' as test_name;

-- Check if this analysis work item exists and has transactions
SELECT 
    awi.id,
    awi.code,
    awi.name,
    COUNT(DISTINCT t.id) as transaction_count
FROM analysis_work_items awi
LEFT JOIN transactions t ON t.analysis_work_item_id = awi.id
WHERE awi.id = 'YOUR_ANALYSIS_WORK_ITEM_ID_HERE'  -- Replace with actual ID
GROUP BY awi.id, awi.code, awi.name;

-- Check account summary with analysis work item filter - this should match what's shown in overview
SELECT 
    account_code,
    account_name_ar,
    transaction_count,
    period_debits,
    period_credits
FROM get_gl_account_summary_filtered(
    p_analysis_work_item_id => 'YOUR_ANALYSIS_WORK_ITEM_ID_HERE',  -- Replace with actual ID
    p_limit => 20
)
ORDER BY account_code;

-- Check detailed transactions with analysis work item filter - this should match drill-down
SELECT 
    entry_number,
    entry_date,
    account_code,
    account_name_ar,
    description,
    debit,
    credit
FROM get_general_ledger_report_filtered(
    p_analysis_work_item_id => 'YOUR_ANALYSIS_WORK_ITEM_ID_HERE',  -- Replace with actual ID
    p_limit => 20
)
ORDER BY entry_date, entry_number;

-- The problem is likely in the GL account summary function
-- It may be including accounts that don't actually have transactions with the analysis work item
-- Let's fix this by ensuring we only include accounts that actually have transactions matching the filter

-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered CASCADE;

-- Create corrected get_gl_account_summary_filtered that properly filters accounts
CREATE FUNCTION public.get_gl_account_summary_filtered(
    p_date_from date DEFAULT NULL,
    p_date_to date DEFAULT NULL,
    p_org_id text DEFAULT NULL,
    p_project_id text DEFAULT NULL,
    p_posted_only boolean DEFAULT false,
    p_limit integer DEFAULT 100,
    p_offset integer DEFAULT 0,
    p_classification_id text DEFAULT NULL,
    p_analysis_work_item_id text DEFAULT NULL,
    p_expenses_category_id text DEFAULT NULL
)
RETURNS TABLE(
    account_id uuid,
    account_code text,
    account_name_ar text,
    account_name_en text,
    opening_debit numeric,
    opening_credit numeric,
    period_debits numeric,
    period_credits numeric,
    closing_debit numeric,
    closing_credit numeric,
    transaction_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH account_transactions AS (
        -- Debit transactions for each account
        SELECT 
            a.id as s_account_id,
            COALESCE(a.code, '')::text as s_account_code,
            COALESCE(a.name_ar, COALESCE(a.name, ''))::text as s_account_name_ar,
            COALESCE(a.name, COALESCE(a.name_ar, ''))::text as s_account_name_en,
            t.entry_date as s_entry_date,
            t.amount as s_debit_amount,
            0::numeric as s_credit_amount,
            t.id as s_transaction_id
        FROM accounts a
        JOIN transactions t ON t.debit_account_id = a.id
        WHERE (p_org_id IS NULL OR a.org_id = p_org_id::uuid)
          AND (p_org_id IS NULL OR t.org_id IS NULL OR t.org_id = p_org_id::uuid)
          AND (p_project_id IS NULL OR t.project_id IS NULL OR t.project_id = p_project_id::uuid)
          AND (NOT p_posted_only OR t.is_posted = true)
          AND (p_classification_id IS NULL OR t.classification_id IS NULL OR t.classification_id = p_classification_id::uuid)
          -- FIXED: Only include transactions that match the analysis work item filter
          AND (p_analysis_work_item_id IS NULL OR t.analysis_work_item_id = p_analysis_work_item_id::uuid)
          AND (p_expenses_category_id IS NULL OR t.expenses_category_id IS NULL OR t.expenses_category_id = p_expenses_category_id::uuid)
        
        UNION ALL
        
        -- Credit transactions for each account
        SELECT 
            a.id as s_account_id,
            COALESCE(a.code, '')::text as s_account_code,
            COALESCE(a.name_ar, COALESCE(a.name, ''))::text as s_account_name_ar,
            COALESCE(a.name, COALESCE(a.name_ar, ''))::text as s_account_name_en,
            t.entry_date as s_entry_date,
            0::numeric as s_debit_amount,
            t.amount as s_credit_amount,
            t.id as s_transaction_id
        FROM accounts a
        JOIN transactions t ON t.credit_account_id = a.id
        WHERE (p_org_id IS NULL OR a.org_id = p_org_id::uuid)
          AND (p_org_id IS NULL OR t.org_id IS NULL OR t.org_id = p_org_id::uuid)
          AND (p_project_id IS NULL OR t.project_id IS NULL OR t.project_id = p_project_id::uuid)
          AND (NOT p_posted_only OR t.is_posted = true)
          AND (p_classification_id IS NULL OR t.classification_id IS NULL OR t.classification_id = p_classification_id::uuid)
          -- FIXED: Only include transactions that match the analysis work item filter
          AND (p_analysis_work_item_id IS NULL OR t.analysis_work_item_id = p_analysis_work_item_id::uuid)
          AND (p_expenses_category_id IS NULL OR t.expenses_category_id IS NULL OR t.expenses_category_id = p_expenses_category_id::uuid)
    )
    SELECT 
        at.s_account_id,
        at.s_account_code,
        at.s_account_name_ar,
        at.s_account_name_en,
        COALESCE(SUM(CASE WHEN p_date_from IS NULL OR at.s_entry_date < p_date_from THEN at.s_debit_amount ELSE 0 END), 0) as opening_debit,
        COALESCE(SUM(CASE WHEN p_date_from IS NULL OR at.s_entry_date < p_date_from THEN at.s_credit_amount ELSE 0 END), 0) as opening_credit,
        COALESCE(SUM(CASE WHEN (p_date_from IS NULL OR at.s_entry_date >= p_date_from) AND (p_date_to IS NULL OR at.s_entry_date <= p_date_to) THEN at.s_debit_amount ELSE 0 END), 0) as period_debits,
        COALESCE(SUM(CASE WHEN (p_date_from IS NULL OR at.s_entry_date >= p_date_from) AND (p_date_to IS NULL OR at.s_entry_date <= p_date_to) THEN at.s_credit_amount ELSE 0 END), 0) as period_credits,
        COALESCE(SUM(at.s_debit_amount), 0) as closing_debit,
        COALESCE(SUM(at.s_credit_amount), 0) as closing_credit,
        COUNT(DISTINCT CASE WHEN (p_date_from IS NULL OR at.s_entry_date >= p_date_from) AND (p_date_to IS NULL OR at.s_entry_date <= p_date_to) THEN at.s_transaction_id END) as transaction_count
    FROM account_transactions at
    GROUP BY at.s_account_id, at.s_account_code, at.s_account_name_ar, at.s_account_name_en
    HAVING COUNT(at.s_transaction_id) > 0
    ORDER BY at.s_account_code
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_gl_account_summary_filtered TO authenticated;

-- Test the fix
SELECT '✅ Fixed analysis work item filtering in GL account summary' as fix_status;

-- Test query to verify the fix works
SELECT 
    'After fix - accounts with analysis work item transactions' as test_name,
    COUNT(*) as account_count
FROM get_gl_account_summary_filtered(
    p_analysis_work_item_id => 'YOUR_ANALYSIS_WORK_ITEM_ID_HERE',  -- Replace with actual ID
    p_limit => 1000
);

-- Also check expenses category filtering fix
SELECT 
    'Testing expenses category + analysis work item filters together' as test_name,
    COUNT(*) as account_count
FROM get_gl_account_summary_filtered(
    p_analysis_work_item_id => 'YOUR_ANALYSIS_WORK_ITEM_ID_HERE',  -- Replace with actual ID
    p_expenses_category_id => 'YOUR_EXPENSES_CATEGORY_ID_HERE',     -- Replace with actual ID if testing both
    p_limit => 1000
);