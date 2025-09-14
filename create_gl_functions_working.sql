-- Working GL functions with fully qualified names and unique aliases
-- Based on actual database schema with transactions table

-- First verify the tables exist
SELECT 'Transactions table found' as info, COUNT(*) as row_count FROM transactions LIMIT 1;
SELECT 'Accounts table found' as info, COUNT(*) as row_count FROM accounts LIMIT 1;

-- Drop any conflicting functions first
DROP FUNCTION IF EXISTS public.get_general_ledger_report_filtered CASCADE;
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered CASCADE;

-- Create get_general_ledger_report_filtered with fully qualified names
CREATE FUNCTION public.get_general_ledger_report_filtered(
    p_account_id text DEFAULT NULL,
    p_date_from date DEFAULT NULL,
    p_date_to date DEFAULT NULL,
    p_org_id text DEFAULT NULL,
    p_project_id text DEFAULT NULL,
    p_include_opening boolean DEFAULT true,
    p_posted_only boolean DEFAULT false,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0,
    p_classification_id text DEFAULT NULL,
    p_analysis_work_item_id text DEFAULT NULL,
    p_expenses_category_id text DEFAULT NULL
)
RETURNS TABLE(
    entry_number text,
    entry_date date,
    account_code text,
    account_name_ar text,
    account_name_en text,
    description text,
    debit numeric,
    credit numeric,
    running_debit numeric,
    running_credit numeric,
    total_rows bigint
) 
LANGUAGE plpgsql
AS $$
DECLARE
    row_count bigint;
BEGIN
    -- Get total count for pagination by expanding transactions into debit/credit entries
    SELECT COUNT(*) INTO row_count
    FROM (
        -- Debit entries
        SELECT t.id, t.entry_date as trans_date, t.debit_account_id as acc_id, t.amount as deb_amt, 0 as cred_amt
        FROM transactions t
        WHERE (p_account_id IS NULL OR t.debit_account_id = p_account_id::uuid)
          AND (p_org_id IS NULL OR t.org_id = p_org_id::uuid)
          AND (p_project_id IS NULL OR t.project_id = p_project_id::uuid)
          AND (p_date_from IS NULL OR t.entry_date >= p_date_from)
          AND (p_date_to IS NULL OR t.entry_date <= p_date_to)
          AND (NOT p_posted_only OR t.is_posted = true)
          AND (p_classification_id IS NULL OR t.classification_id = p_classification_id::uuid)
          AND (p_analysis_work_item_id IS NULL OR t.analysis_work_item_id = p_analysis_work_item_id::uuid)
          AND (p_expenses_category_id IS NULL OR t.expenses_category_id = p_expenses_category_id::uuid)
        
        UNION ALL
        
        -- Credit entries
        SELECT t.id, t.entry_date as trans_date, t.credit_account_id as acc_id, 0 as deb_amt, t.amount as cred_amt
        FROM transactions t
        WHERE (p_account_id IS NULL OR t.credit_account_id = p_account_id::uuid)
          AND (p_org_id IS NULL OR t.org_id = p_org_id::uuid)
          AND (p_project_id IS NULL OR t.project_id = p_project_id::uuid)
          AND (p_date_from IS NULL OR t.entry_date >= p_date_from)
          AND (p_date_to IS NULL OR t.entry_date <= p_date_to)
          AND (NOT p_posted_only OR t.is_posted = true)
          AND (p_classification_id IS NULL OR t.classification_id = p_classification_id::uuid)
          AND (p_analysis_work_item_id IS NULL OR t.analysis_work_item_id = p_analysis_work_item_id::uuid)
          AND (p_expenses_category_id IS NULL OR t.expenses_category_id = p_expenses_category_id::uuid)
    ) combined_entries;

    -- Return paginated results with running balances
    RETURN QUERY
    WITH expanded_entries AS (
        -- Debit entries
        SELECT 
            t.entry_number as t_entry_number,
            t.entry_date as t_entry_date,
            COALESCE(a.code, '') as t_account_code,
            COALESCE(a.name_ar, COALESCE(a.name, '')) as t_account_name_ar,
            COALESCE(a.name, COALESCE(a.name_ar, '')) as t_account_name_en,
            COALESCE(t.description, '') as t_description,
            t.amount as t_debit_amount,
            0::numeric as t_credit_amount,
            ROW_NUMBER() OVER (ORDER BY t.entry_date, t.entry_number, t.id, 1) as t_rn
        FROM transactions t
        JOIN accounts a ON a.id = t.debit_account_id
        WHERE (p_account_id IS NULL OR t.debit_account_id = p_account_id::uuid)
          AND (p_org_id IS NULL OR t.org_id = p_org_id::uuid)
          AND (p_project_id IS NULL OR t.project_id = p_project_id::uuid)
          AND (p_date_from IS NULL OR t.entry_date >= p_date_from)
          AND (p_date_to IS NULL OR t.entry_date <= p_date_to)
          AND (NOT p_posted_only OR t.is_posted = true)
          AND (p_classification_id IS NULL OR t.classification_id = p_classification_id::uuid)
          AND (p_analysis_work_item_id IS NULL OR t.analysis_work_item_id = p_analysis_work_item_id::uuid)
          AND (p_expenses_category_id IS NULL OR t.expenses_category_id = p_expenses_category_id::uuid)
        
        UNION ALL
        
        -- Credit entries
        SELECT 
            t.entry_number as t_entry_number,
            t.entry_date as t_entry_date,
            COALESCE(a.code, '') as t_account_code,
            COALESCE(a.name_ar, COALESCE(a.name, '')) as t_account_name_ar,
            COALESCE(a.name, COALESCE(a.name_ar, '')) as t_account_name_en,
            COALESCE(t.description, '') as t_description,
            0::numeric as t_debit_amount,
            t.amount as t_credit_amount,
            ROW_NUMBER() OVER (ORDER BY t.entry_date, t.entry_number, t.id, 2) as t_rn
        FROM transactions t
        JOIN accounts a ON a.id = t.credit_account_id
        WHERE (p_account_id IS NULL OR t.credit_account_id = p_account_id::uuid)
          AND (p_org_id IS NULL OR t.org_id = p_org_id::uuid)
          AND (p_project_id IS NULL OR t.project_id = p_project_id::uuid)
          AND (p_date_from IS NULL OR t.entry_date >= p_date_from)
          AND (p_date_to IS NULL OR t.entry_date <= p_date_to)
          AND (NOT p_posted_only OR t.is_posted = true)
          AND (p_classification_id IS NULL OR t.classification_id = p_classification_id::uuid)
          AND (p_analysis_work_item_id IS NULL OR t.analysis_work_item_id = p_analysis_work_item_id::uuid)
          AND (p_expenses_category_id IS NULL OR t.expenses_category_id = p_expenses_category_id::uuid)
    ),
    paginated_entries AS (
        SELECT * FROM expanded_entries
        ORDER BY t_entry_date, t_entry_number, t_rn
        LIMIT p_limit OFFSET p_offset
    ),
    running_totals AS (
        SELECT *,
            SUM(t_debit_amount) OVER (ORDER BY t_entry_date, t_entry_number, t_rn ROWS UNBOUNDED PRECEDING) as t_running_debit_amount,
            SUM(t_credit_amount) OVER (ORDER BY t_entry_date, t_entry_number, t_rn ROWS UNBOUNDED PRECEDING) as t_running_credit_amount
        FROM paginated_entries
    )
    SELECT 
        rt.t_entry_number,
        rt.t_entry_date,
        rt.t_account_code,
        rt.t_account_name_ar,
        rt.t_account_name_en,
        rt.t_description,
        rt.t_debit_amount,
        rt.t_credit_amount,
        rt.t_running_debit_amount,
        rt.t_running_credit_amount,
        row_count
    FROM running_totals rt;
END;
$$;

-- Create get_gl_account_summary_filtered with fully qualified names
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
            COALESCE(a.code, '') as s_account_code,
            COALESCE(a.name_ar, COALESCE(a.name, '')) as s_account_name_ar,
            COALESCE(a.name, COALESCE(a.name_ar, '')) as s_account_name_en,
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
          AND (p_analysis_work_item_id IS NULL OR t.analysis_work_item_id IS NULL OR t.analysis_work_item_id = p_analysis_work_item_id::uuid)
          AND (p_expenses_category_id IS NULL OR t.expenses_category_id IS NULL OR t.expenses_category_id = p_expenses_category_id::uuid)
        
        UNION ALL
        
        -- Credit transactions for each account
        SELECT 
            a.id as s_account_id,
            COALESCE(a.code, '') as s_account_code,
            COALESCE(a.name_ar, COALESCE(a.name, '')) as s_account_name_ar,
            COALESCE(a.name, COALESCE(a.name_ar, '')) as s_account_name_en,
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
          AND (p_analysis_work_item_id IS NULL OR t.analysis_work_item_id IS NULL OR t.analysis_work_item_id = p_analysis_work_item_id::uuid)
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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_general_ledger_report_filtered TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_gl_account_summary_filtered TO authenticated;

-- Verify the functions were created successfully
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as parameters,
    '✅ Function created with fully qualified names' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND (p.proname = 'get_general_ledger_report_filtered' OR p.proname = 'get_gl_account_summary_filtered')
  AND pg_get_function_identity_arguments(p.oid) LIKE '%expenses_category_id%'
ORDER BY p.proname;

-- Quick test to verify they work
SELECT 'Testing get_general_ledger_report_filtered' as test_name, COUNT(*) as result FROM get_general_ledger_report_filtered(p_limit => 5);
SELECT 'Testing get_gl_account_summary_filtered' as test_name, COUNT(*) as result FROM get_gl_account_summary_filtered(p_limit => 5);

-- Test expenses category filtering specifically
SELECT 'Testing expenses category filter' as test_name, COUNT(*) as filtered_count 
FROM get_general_ledger_report_filtered(p_expenses_category_id => '00000000-0000-0000-0000-000000000001', p_limit => 1000);