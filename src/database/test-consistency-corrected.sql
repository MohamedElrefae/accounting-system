-- Test balance consistency between Trial Balance Original and GL Summary using correct function
-- Copy and paste this SQL block to verify the fix

WITH trial_balance_calculation AS (
    -- Replicate the reverted Trial Balance Original logic
    SELECT 
        a.id as account_id,
        a.code,
        a.name,
        COALESCE(SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0) as tb_debit,
        COALESCE(SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0) as tb_credit
    FROM accounts a
    LEFT JOIN transactions t ON (
        (t.debit_account_id = a.id OR t.credit_account_id = a.id)
        AND t.entry_date >= '2024-01-01'
        AND t.entry_date <= CURRENT_DATE
    )
    GROUP BY a.id, a.code, a.name
),
gl_summary AS (
    -- Use the correct GL Summary function with proper parameters
    SELECT 
        s.account_id,
        s.account_code,
        s.account_name_en as account_name,
        s.closing_debit,
        s.closing_credit
    FROM public.get_gl_account_summary(
        '2024-01-01'::date,    -- p_date_from
        CURRENT_DATE::date,     -- p_date_to  
        NULL,                   -- p_org_id (NULL for all orgs)
        NULL,                   -- p_project_id (NULL for all projects)
        false,                  -- p_posted_only (include all transactions)
        NULL,                   -- p_limit
        NULL,                   -- p_offset
        NULL,                   -- p_classification_id
        NULL,                   -- p_cost_center_id
        NULL,                   -- p_work_item_id
        NULL,                   -- p_expenses_category_id
        NULL,                   -- p_debit_account_id
        NULL,                   -- p_credit_account_id
        NULL,                   -- p_amount_min
        NULL                    -- p_amount_max
    ) s
),
comparison AS (
    SELECT 
        COALESCE(tb.account_id, gl.account_id) as account_id,
        COALESCE(tb.code, gl.account_code) as code,
        COALESCE(tb.name, gl.account_name) as name,
        COALESCE(tb.tb_debit, 0) as tb_debit,
        COALESCE(tb.tb_credit, 0) as tb_credit,
        COALESCE(gl.closing_debit, 0) as gl_debit,
        COALESCE(gl.closing_credit, 0) as gl_credit,
        CASE 
            WHEN ABS(COALESCE(tb.tb_debit, 0) - COALESCE(gl.closing_debit, 0)) < 0.01 
                AND ABS(COALESCE(tb.tb_credit, 0) - COALESCE(gl.closing_credit, 0)) < 0.01 
            THEN 'MATCH'
            ELSE 'DIFFER'
        END as status,
        ABS(COALESCE(tb.tb_debit, 0) - COALESCE(gl.closing_debit, 0)) as debit_diff,
        ABS(COALESCE(tb.tb_credit, 0) - COALESCE(gl.closing_credit, 0)) as credit_diff
    FROM trial_balance_calculation tb
    FULL OUTER JOIN gl_summary gl ON tb.account_id = gl.account_id
    WHERE (COALESCE(tb.tb_debit, 0) != 0 OR COALESCE(tb.tb_credit, 0) != 0 
           OR COALESCE(gl.closing_debit, 0) != 0 OR COALESCE(gl.closing_credit, 0) != 0)
)
SELECT 
    -- Summary Report
    COUNT(*) as total_accounts_tested,
    COUNT(CASE WHEN status = 'MATCH' THEN 1 END) as matching_accounts,
    COUNT(CASE WHEN status = 'DIFFER' THEN 1 END) as differing_accounts,
    ROUND(
        COUNT(CASE WHEN status = 'MATCH' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 
        1
    ) as consistency_percentage,
    MAX(debit_diff + credit_diff) as max_difference,
    SUM(tb_debit) as total_tb_debits,
    SUM(tb_credit) as total_tb_credits,
    SUM(gl_debit) as total_gl_debits, 
    SUM(gl_credit) as total_gl_credits,
    CASE 
        WHEN ABS(SUM(tb_debit) - SUM(tb_credit)) < 0.01 THEN 'TB BALANCED ✓'
        ELSE 'TB UNBALANCED ⚠'
    END as tb_balance_status,
    CASE 
        WHEN ABS(SUM(gl_debit) - SUM(gl_credit)) < 0.01 THEN 'GL BALANCED ✓'
        ELSE 'GL UNBALANCED ⚠'
    END as gl_balance_status
FROM comparison;

-- Detailed breakdown of any differences (top 10)
SELECT 
    '=== DIFFERENCES DETAIL ===' as section_header,
    code,
    name,
    tb_debit,
    tb_credit,
    gl_debit,
    gl_credit,
    debit_diff,
    credit_diff,
    (debit_diff + credit_diff) as total_diff,
    status
FROM comparison
WHERE status = 'DIFFER'
ORDER BY (debit_diff + credit_diff) DESC
LIMIT 10;
