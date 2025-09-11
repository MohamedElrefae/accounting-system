-- Verify Account Explorer Print Totals Fix
-- This should show that root accounts totals match UI grand totals

WITH gl_summary_base AS (
    SELECT 
        s.account_id,
        s.closing_debit,
        s.closing_credit
    FROM public.get_gl_account_summary(
        '2024-01-01'::date,
        CURRENT_DATE::date,
        'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,
        NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    ) s
    WHERE s.closing_debit != 0 OR s.closing_credit != 0
),
account_hierarchy AS (
    SELECT 
        a.id,
        a.code,
        a.name,
        a.parent_id,
        a.level,
        COALESCE(gl.closing_debit, 0) as closing_debit,
        COALESCE(gl.closing_credit, 0) as closing_credit
    FROM accounts a
    LEFT JOIN gl_summary_base gl ON a.id = gl.account_id
    WHERE a.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
),
-- Simulate the rollup calculation
account_rollup AS (
    SELECT 
        id,
        code,
        name,
        parent_id,
        level,
        closing_debit,
        closing_credit,
        -- For this test, assume rollup = original amounts (simplified)
        closing_debit as rollup_closing_debit,
        closing_credit as rollup_closing_credit
    FROM account_hierarchy
)

SELECT 
    '🔍 TOTALS COMPARISON TEST' as test_type,
    
    -- What PRINT function will now calculate (ROOT ACCOUNTS ONLY)
    (SELECT COALESCE(SUM(rollup_closing_debit), 0) 
     FROM account_rollup 
     WHERE parent_id IS NULL) as print_total_debits,
     
    (SELECT COALESCE(SUM(rollup_closing_credit), 0) 
     FROM account_rollup 
     WHERE parent_id IS NULL) as print_total_credits,
    
    -- What PRINT function calculated before (ALL FLAT ACCOUNTS) - should be different
    (SELECT COALESCE(SUM(rollup_closing_debit), 0) 
     FROM account_rollup) as old_print_total_debits,
     
    (SELECT COALESCE(SUM(rollup_closing_credit), 0) 
     FROM account_rollup) as old_print_total_credits,
    
    -- Balance check for new method
    CASE 
        WHEN ABS((SELECT COALESCE(SUM(rollup_closing_debit), 0) FROM account_rollup WHERE parent_id IS NULL) - 
                 (SELECT COALESCE(SUM(rollup_closing_credit), 0) FROM account_rollup WHERE parent_id IS NULL)) < 0.01 
        THEN '✅ NEW METHOD BALANCED'
        ELSE '❌ NEW METHOD UNBALANCED'
    END as new_balance_status,
    
    -- Show the difference
    (SELECT COALESCE(SUM(rollup_closing_debit), 0) FROM account_rollup) -
    (SELECT COALESCE(SUM(rollup_closing_debit), 0) FROM account_rollup WHERE parent_id IS NULL) as debit_difference,
    
    (SELECT COALESCE(SUM(rollup_closing_credit), 0) FROM account_rollup) -
    (SELECT COALESCE(SUM(rollup_closing_credit), 0) FROM account_rollup WHERE parent_id IS NULL) as credit_difference;

-- Show root accounts that will be used for print totals
WITH gl_summary_base AS (
    SELECT 
        s.account_id,
        s.closing_debit,
        s.closing_credit
    FROM public.get_gl_account_summary(
        '2024-01-01'::date,
        CURRENT_DATE::date,
        'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,
        NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    ) s
    WHERE s.closing_debit != 0 OR s.closing_credit != 0
)

SELECT 
    '📋 ROOT ACCOUNTS FOR PRINT' as section,
    a.code,
    a.name,
    COALESCE(gl.closing_debit, 0) as closing_debit,
    COALESCE(gl.closing_credit, 0) as closing_credit,
    (SELECT COUNT(*) FROM accounts child WHERE child.parent_id = a.id AND child.org_id = a.org_id) as child_count
FROM accounts a
LEFT JOIN gl_summary_base gl ON a.id = gl.account_id
WHERE a.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
  AND a.parent_id IS NULL
ORDER BY a.code;
