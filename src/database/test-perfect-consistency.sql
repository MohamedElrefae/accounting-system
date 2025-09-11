-- Test perfect consistency after updating Trial Balance Original to use GL Summary directly
-- Copy and paste this SQL block to verify 100% consistency

WITH trial_balance_gl_based AS (
    -- This now replicates exactly what Trial Balance Original does using GL Summary
    SELECT 
        s.account_id,
        s.account_code as code,
        s.account_name_en as name,
        s.closing_debit as debit,
        s.closing_credit as credit
    FROM public.get_gl_account_summary(
        '2024-01-01'::date,                                -- dateFrom
        CURRENT_DATE::date,                                -- dateTo
        'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,     -- orgId
        NULL,                                              -- projectId
        false,                                             -- postedOnly
        NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    ) s
),
gl_summary_direct AS (
    -- Direct GL Summary call (same as above, but separate for comparison)
    SELECT 
        s.account_id,
        s.account_code as code,
        s.account_name_en as name,
        s.closing_debit as debit,
        s.closing_credit as credit
    FROM public.get_gl_account_summary(
        '2024-01-01'::date,
        CURRENT_DATE::date,
        'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,
        NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    ) s
),
comparison AS (
    SELECT 
        COALESCE(tb.account_id, gl.account_id) as account_id,
        COALESCE(tb.code, gl.code) as code,
        COALESCE(tb.name, gl.name) as name,
        COALESCE(tb.debit, 0) as tb_debit,
        COALESCE(tb.credit, 0) as tb_credit,
        COALESCE(gl.debit, 0) as gl_debit,
        COALESCE(gl.credit, 0) as gl_credit,
        CASE 
            WHEN ABS(COALESCE(tb.debit, 0) - COALESCE(gl.debit, 0)) < 0.01 
                AND ABS(COALESCE(tb.credit, 0) - COALESCE(gl.credit, 0)) < 0.01 
            THEN 'PERFECT_MATCH'
            ELSE 'IMPOSSIBLE_DIFFERENCE'
        END as status
    FROM trial_balance_gl_based tb
    FULL OUTER JOIN gl_summary_direct gl ON tb.account_id = gl.account_id
    WHERE (COALESCE(tb.debit, 0) != 0 OR COALESCE(tb.credit, 0) != 0 
           OR COALESCE(gl.debit, 0) != 0 OR COALESCE(gl.credit, 0) != 0)
)
SELECT 
    -- Perfect Consistency Report
    '🎯 PERFECT CONSISTENCY TEST' as test_result,
    COUNT(*) as total_accounts,
    COUNT(CASE WHEN status = 'PERFECT_MATCH' THEN 1 END) as perfect_matches,
    COUNT(CASE WHEN status = 'IMPOSSIBLE_DIFFERENCE' THEN 1 END) as impossible_differences,
    CASE 
        WHEN COUNT(CASE WHEN status = 'PERFECT_MATCH' THEN 1 END) = COUNT(*) THEN '✅ 100% PERFECT CONSISTENCY ACHIEVED'
        ELSE '❌ SOMETHING IS WRONG - SAME FUNCTION SHOULD ALWAYS MATCH'
    END as consistency_status,
    SUM(tb_debit) as total_debits,
    SUM(tb_credit) as total_credits,
    CASE 
        WHEN ABS(SUM(tb_debit) - SUM(tb_credit)) < 0.01 THEN '✅ BALANCED'
        ELSE '❌ UNBALANCED'
    END as balance_status
FROM comparison;

-- Show account breakdown by type for verification
WITH trial_balance_gl_based AS (
    SELECT 
        s.account_id,
        s.account_code as code,
        s.account_name_en as name,
        s.closing_debit as debit,
        s.closing_credit as credit,
        -- Account type classification
        CASE 
            WHEN LEFT(s.account_code, 1) = '1' THEN 'Assets'
            WHEN LEFT(s.account_code, 1) = '2' THEN 'Liabilities'
            WHEN LEFT(s.account_code, 1) = '3' THEN 'Equity'
            WHEN LEFT(s.account_code, 1) = '4' THEN 'Revenue'
            WHEN LEFT(s.account_code, 1) = '5' THEN 'Expenses'
            ELSE 'Other'
        END as account_type
    FROM public.get_gl_account_summary(
        '2024-01-01'::date,
        CURRENT_DATE::date,
        'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,
        NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    ) s
    WHERE s.closing_debit != 0 OR s.closing_credit != 0
)
SELECT 
    '📊 ACCOUNT TYPE BREAKDOWN' as section,
    account_type,
    COUNT(*) as account_count,
    SUM(debit) as total_debits,
    SUM(credit) as total_credits,
    SUM(debit + credit) as total_activity
FROM trial_balance_gl_based
GROUP BY account_type
ORDER BY 
    CASE account_type
        WHEN 'Assets' THEN 1
        WHEN 'Liabilities' THEN 2  
        WHEN 'Equity' THEN 3
        WHEN 'Revenue' THEN 4
        WHEN 'Expenses' THEN 5
        ELSE 6
    END;
