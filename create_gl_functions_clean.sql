-- Clean creation of GL functions after dropping all conflicting versions
-- Run this AFTER running force_drop_gl_functions.sql

-- Verify no conflicting functions exist
SELECT 
    COUNT(*) as existing_functions,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Ready to create functions'
        ELSE '❌ Still have conflicts - run force_drop_gl_functions.sql first'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND (p.proname = 'get_general_ledger_report_filtered' OR p.proname = 'get_gl_account_summary_filtered');

-- Create get_general_ledger_report_filtered with expenses_category_id support
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
    -- Get total count for pagination
    SELECT COUNT(*) INTO total_count
    FROM transaction_entries te
    JOIN transactions t ON te.transaction_id = t.id
    JOIN accounts a ON te.account_id = a.id
    WHERE (p_account_id IS NULL OR te.account_id = p_account_id::uuid)
      AND (p_org_id IS NULL OR t.org_id = p_org_id::uuid)
      AND (p_project_id IS NULL OR t.project_id = p_project_id::uuid)
      AND (p_date_from IS NULL OR t.transaction_date >= p_date_from)
      AND (p_date_to IS NULL OR t.transaction_date <= p_date_to)
      AND (NOT p_posted_only OR t.is_posted = true)
      AND (p_classification_id IS NULL OR t.classification_id = p_classification_id::uuid)
      AND (p_analysis_work_item_id IS NULL OR t.analysis_work_item_id = p_analysis_work_item_id::uuid)
      AND (p_expenses_category_id IS NULL OR t.expenses_category_id = p_expenses_category_id::uuid);

    -- Return paginated results with running balances
    RETURN QUERY
    WITH filtered_entries AS (
        SELECT 
            t.entry_number,
            t.transaction_date as entry_date,
            a.code as account_code,
            a.name_ar as account_name_ar,
            a.name_en as account_name_en,
            COALESCE(t.description, '') as description,
            CASE WHEN te.is_debit THEN te.amount ELSE 0 END as debit,
            CASE WHEN NOT te.is_debit THEN te.amount ELSE 0 END as credit,
            ROW_NUMBER() OVER (ORDER BY t.transaction_date, t.entry_number, te.id) as rn
        FROM transaction_entries te
        JOIN transactions t ON te.transaction_id = t.id
        JOIN accounts a ON te.account_id = a.id
        WHERE (p_account_id IS NULL OR te.account_id = p_account_id::uuid)
          AND (p_org_id IS NULL OR t.org_id = p_org_id::uuid)
          AND (p_project_id IS NULL OR t.project_id = p_project_id::uuid)
          AND (p_date_from IS NULL OR t.transaction_date >= p_date_from)
          AND (p_date_to IS NULL OR t.transaction_date <= p_date_to)
          AND (NOT p_posted_only OR t.is_posted = true)
          AND (p_classification_id IS NULL OR t.classification_id = p_classification_id::uuid)
          AND (p_analysis_work_item_id IS NULL OR t.analysis_work_item_id = p_analysis_work_item_id::uuid)
          AND (p_expenses_category_id IS NULL OR t.expenses_category_id = p_expenses_category_id::uuid)
        ORDER BY t.transaction_date, t.entry_number, te.id
        LIMIT p_limit OFFSET p_offset
    ),
    running_totals AS (
        SELECT *,
            SUM(debit) OVER (ORDER BY rn ROWS UNBOUNDED PRECEDING) as running_debit,
            SUM(credit) OVER (ORDER BY rn ROWS UNBOUNDED PRECEDING) as running_credit
        FROM filtered_entries
    )
    SELECT 
        rt.entry_number,
        rt.entry_date,
        rt.account_code,
        rt.account_name_ar,
        rt.account_name_en,
        rt.description,
        rt.debit,
        rt.credit,
        rt.running_debit,
        rt.running_credit,
        total_count
    FROM running_totals rt;
END;
$$;

-- Create get_gl_account_summary_filtered with expenses_category_id support  
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
    SELECT 
        a.id as account_id,
        a.code as account_code,
        a.name_ar as account_name_ar,
        a.name_en as account_name_en,
        COALESCE(SUM(CASE WHEN te.is_debit AND (p_date_from IS NULL OR t.transaction_date < p_date_from) THEN te.amount ELSE 0 END), 0) as opening_debit,
        COALESCE(SUM(CASE WHEN NOT te.is_debit AND (p_date_from IS NULL OR t.transaction_date < p_date_from) THEN te.amount ELSE 0 END), 0) as opening_credit,
        COALESCE(SUM(CASE WHEN te.is_debit AND (p_date_from IS NULL OR t.transaction_date >= p_date_from) AND (p_date_to IS NULL OR t.transaction_date <= p_date_to) THEN te.amount ELSE 0 END), 0) as period_debits,
        COALESCE(SUM(CASE WHEN NOT te.is_debit AND (p_date_from IS NULL OR t.transaction_date >= p_date_from) AND (p_date_to IS NULL OR t.transaction_date <= p_date_to) THEN te.amount ELSE 0 END), 0) as period_credits,
        COALESCE(SUM(CASE WHEN te.is_debit THEN te.amount ELSE 0 END), 0) as closing_debit,
        COALESCE(SUM(CASE WHEN NOT te.is_debit THEN te.amount ELSE 0 END), 0) as closing_credit,
        COUNT(DISTINCT CASE WHEN (p_date_from IS NULL OR t.transaction_date >= p_date_from) AND (p_date_to IS NULL OR t.transaction_date <= p_date_to) THEN t.id END) as transaction_count
    FROM accounts a
    LEFT JOIN transaction_entries te ON te.account_id = a.id
    LEFT JOIN transactions t ON te.transaction_id = t.id
    WHERE (p_org_id IS NULL OR a.org_id = p_org_id::uuid)
      AND (p_org_id IS NULL OR t.org_id IS NULL OR t.org_id = p_org_id::uuid)
      AND (p_project_id IS NULL OR t.project_id IS NULL OR t.project_id = p_project_id::uuid)
      AND (NOT p_posted_only OR t.is_posted IS NULL OR t.is_posted = true)
      AND (p_classification_id IS NULL OR t.classification_id IS NULL OR t.classification_id = p_classification_id::uuid)
      AND (p_analysis_work_item_id IS NULL OR t.analysis_work_item_id IS NULL OR t.analysis_work_item_id = p_analysis_work_item_id::uuid)
      AND (p_expenses_category_id IS NULL OR t.expenses_category_id IS NULL OR t.expenses_category_id = p_expenses_category_id::uuid)
    GROUP BY a.id, a.code, a.name_ar, a.name_en
    HAVING COUNT(te.id) > 0 OR p_date_from IS NULL
    ORDER BY a.code
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
    '✅ Function created successfully' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND (p.proname = 'get_general_ledger_report_filtered' OR p.proname = 'get_gl_account_summary_filtered')
  AND pg_get_function_identity_arguments(p.oid) LIKE '%expenses_category_id%'
ORDER BY p.proname;

-- Quick test to verify they work
SELECT 'Testing get_general_ledger_report_filtered' as test_name, COUNT(*) as result FROM get_general_ledger_report_filtered(p_limit => 1);
SELECT 'Testing get_gl_account_summary_filtered' as test_name, COUNT(*) as result FROM get_gl_account_summary_filtered(p_limit => 1);