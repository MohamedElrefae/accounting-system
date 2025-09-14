-- Final GL functions with unique column aliases to avoid ambiguity
-- Based on actual database schema with transactions table

-- First verify the tables exist and show their structure
SELECT 'Transactions table found with' as info, COUNT(*) as row_count FROM transactions LIMIT 1;
SELECT 'Accounts table found with' as info, COUNT(*) as row_count FROM accounts LIMIT 1;

-- Drop any conflicting functions first
DROP FUNCTION IF EXISTS public.get_general_ledger_report_filtered CASCADE;
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered CASCADE;

-- Create get_general_ledger_report_filtered with unique column aliases
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
    total_count bigint;
BEGIN
    -- Get total count for pagination by expanding transactions into debit/credit entries
    SELECT COUNT(*) INTO total_count
    FROM (
        -- Debit entries
        SELECT t.id, t.entry_date, t.debit_account_id as account_id, t.amount as debit_amount, 0 as credit_amount
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
        SELECT t.id, t.entry_date, t.credit_account_id as account_id, 0 as debit_amount, t.amount as credit_amount
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
            t.entry_number,
            t.entry_date,
            COALESCE(a.code, '') as account_code,
            COALESCE(a.name_ar, COALESCE(a.name, '')) as account_name_ar,
            COALESCE(a.name, COALESCE(a.name_ar, '')) as account_name_en,
            COALESCE(t.description, '') as description,
            t.amount as debit_amount,
            0::numeric as credit_amount,
            ROW_NUMBER() OVER (ORDER BY t.entry_date, t.entry_number, t.id, 1) as rn
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
            t.entry_number,
            t.entry_date,
            COALESCE(a.code, '') as account_code,
            COALESCE(a.name_ar, COALESCE(a.name, '')) as account_name_ar,
            COALESCE(a.name, COALESCE(a.name_ar, '')) as account_name_en,
            COALESCE(t.description, '') as description,
            0::numeric as debit_amount,
            t.amount as credit_amount,
            ROW_NUMBER() OVER (ORDER BY t.entry_date, t.entry_number, t.id, 2) as rn
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
        ORDER BY entry_date, entry_number, rn
        LIMIT p_limit OFFSET p_offset
    ),
    running_totals AS (
        SELECT *,
            SUM(debit_amount) OVER (ORDER BY entry_date, entry_number, rn ROWS UNBOUNDED PRECEDING) as running_debit_amount,
            SUM(credit_amount) OVER (ORDER BY entry_date, entry_number, rn ROWS UNBOUNDED PRECEDING) as running_credit_amount
        FROM paginated_entries
    )
    SELECT 
        rt.entry_number,
        rt.entry_date,
        rt.account_code,
        rt.account_name_ar,
        rt.account_name_en,
        rt.description,
        rt.debit_amount,    -- Return as debit
        rt.credit_amount,   -- Return as credit
        rt.running_debit_amount,  -- Return as running_debit
        rt.running_credit_amount, -- Return as running_credit
        total_count
    FROM running_totals rt;
END;
$$;

-- Create get_gl_account_summary_filtered with unique column aliases
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
            a.id as account_id,
            COALESCE(a.code, '') as account_code,
            COALESCE(a.name_ar, COALESCE(a.name, '')) as account_name_ar,
            COALESCE(a.name, COALESCE(a.name_ar, '')) as account_name_en,
            t.entry_date,
            t.amount as debit_amount,
            0::numeric as credit_amount,
            t.id as transaction_id
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
            a.id as account_id,
            COALESCE(a.code, '') as account_code,
            COALESCE(a.name_ar, COALESCE(a.name, '')) as account_name_ar,
            COALESCE(a.name, COALESCE(a.name_ar, '')) as account_name_en,
            t.entry_date,
            0::numeric as debit_amount,
            t.amount as credit_amount,
            t.id as transaction_id
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
        at.account_id,
        at.account_code,
        at.account_name_ar,
        at.account_name_en,
        COALESCE(SUM(CASE WHEN p_date_from IS NULL OR at.entry_date < p_date_from THEN at.debit_amount ELSE 0 END), 0) as opening_debit,
        COALESCE(SUM(CASE WHEN p_date_from IS NULL OR at.entry_date < p_date_from THEN at.credit_amount ELSE 0 END), 0) as opening_credit,
        COALESCE(SUM(CASE WHEN (p_date_from IS NULL OR at.entry_date >= p_date_from) AND (p_date_to IS NULL OR at.entry_date <= p_date_to) THEN at.debit_amount ELSE 0 END), 0) as period_debits,
        COALESCE(SUM(CASE WHEN (p_date_from IS NULL OR at.entry_date >= p_date_from) AND (p_date_to IS NULL OR at.entry_date <= p_date_to) THEN at.credit_amount ELSE 0 END), 0) as period_credits,
        COALESCE(SUM(at.debit_amount), 0) as closing_debit,
        COALESCE(SUM(at.credit_amount), 0) as closing_credit,
        COUNT(DISTINCT CASE WHEN (p_date_from IS NULL OR at.entry_date >= p_date_from) AND (p_date_to IS NULL OR at.entry_date <= p_date_to) THEN at.transaction_id END) as transaction_count
    FROM account_transactions at
    GROUP BY at.account_id, at.account_code, at.account_name_ar, at.account_name_en
    HAVING COUNT(at.transaction_id) > 0
    ORDER BY at.account_code
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
    '✅ Function created successfully with unique aliases' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND (p.proname = 'get_general_ledger_report_filtered' OR p.proname = 'get_gl_account_summary_filtered')
  AND pg_get_function_identity_arguments(p.oid) LIKE '%expenses_category_id%'
ORDER BY p.proname;

-- Quick test to verify they work (basic functionality)
SELECT 'Testing get_general_ledger_report_filtered' as test_name, COUNT(*) as result FROM get_general_ledger_report_filtered(p_limit => 5);
SELECT 'Testing get_gl_account_summary_filtered' as test_name, COUNT(*) as result FROM get_gl_account_summary_filtered(p_limit => 5);