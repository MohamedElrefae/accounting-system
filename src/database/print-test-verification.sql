-- Print Test Verification - Trial Balance All Levels Consistency Check
-- This SQL validates that print function will show consistent amounts
-- Copy and paste this SQL block

WITH gl_summary_base AS (
    SELECT 
        s.account_id,
        s.account_code,
        s.account_name_en,
        s.opening_debit,
        s.opening_credit,
        s.period_debits,
        s.period_credits,
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
        a.name_ar,
        a.parent_id,
        a.level,
        a.category,
        COALESCE(gl.opening_debit, 0) as opening_debit,
        COALESCE(gl.opening_credit, 0) as opening_credit,
        COALESCE(gl.period_debits, 0) as period_debits,
        COALESCE(gl.period_credits, 0) as period_credits,
        COALESCE(gl.closing_debit, 0) as closing_debit,
        COALESCE(gl.closing_credit, 0) as closing_credit
    FROM accounts a
    LEFT JOIN gl_summary_base gl ON a.id = gl.account_id
    WHERE a.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
    ORDER BY a.code
),
print_preview AS (
    SELECT 
        '🖨️ PRINT PREVIEW VALIDATION' as test_type,
        code,
        COALESCE(name_ar, name) as display_name,
        level,
        parent_id,
        
        -- What print function SHOULD show (consistent closing amounts)
        closing_debit as print_debit_amount,
        closing_credit as print_credit_amount,
        
        -- Alternative amounts (for comparison)
        period_debits as period_debit_amount,
        period_credits as period_credit_amount,
        
        -- Validation flags
        CASE 
            WHEN closing_debit > 0 AND period_debits > 0 AND closing_debit != period_debits 
            THEN '⚠️ DIFFERENT VALUES'
            WHEN closing_debit > 0 OR period_debits > 0 
            THEN '✅ CONSISTENT'
            ELSE '➖ NO DEBIT'
        END as debit_consistency,
        
        CASE 
            WHEN closing_credit > 0 AND period_credits > 0 AND closing_credit != period_credits 
            THEN '⚠️ DIFFERENT VALUES'
            WHEN closing_credit > 0 OR period_credits > 0 
            THEN '✅ CONSISTENT'
            ELSE '➖ NO CREDIT'
        END as credit_consistency,
        
        -- Account type for grouping
        CASE 
            WHEN LEFT(code, 1) = '1' THEN 'Assets'
            WHEN LEFT(code, 1) = '2' THEN 'Liabilities'
            WHEN LEFT(code, 1) = '3' THEN 'Equity'
            WHEN LEFT(code, 1) = '4' THEN 'Revenue'
            WHEN LEFT(code, 1) = '5' THEN 'Expenses'
            ELSE 'Other'
        END as account_type
        
    FROM account_hierarchy
    WHERE closing_debit > 0 OR closing_credit > 0 OR period_debits > 0 OR period_credits > 0
)

-- Main print test results
SELECT 
    test_type,
    account_type,
    code,
    display_name,
    level,
    
    -- Print amounts (what will show in printed report)
    CASE WHEN print_debit_amount > 0 
         THEN TO_CHAR(print_debit_amount, 'FM999,999,999,990.00') 
         ELSE '—' 
    END as print_debit,
    
    CASE WHEN print_credit_amount > 0 
         THEN TO_CHAR(print_credit_amount, 'FM999,999,999,990.00') 
         ELSE '—' 
    END as print_credit,
    
    -- Consistency validation
    debit_consistency,
    credit_consistency,
    
    -- Difference flags for troubleshooting
    CASE 
        WHEN ABS(print_debit_amount - period_debit_amount) > 0.01 
        THEN '🔍 DEBIT DIFF: ' || TO_CHAR(ABS(print_debit_amount - period_debit_amount), 'FM999,999,999,990.00')
        ELSE '✅ DEBIT OK'
    END as debit_diff_check,
    
    CASE 
        WHEN ABS(print_credit_amount - period_credit_amount) > 0.01 
        THEN '🔍 CREDIT DIFF: ' || TO_CHAR(ABS(print_credit_amount - period_credit_amount), 'FM999,999,999,990.00')
        ELSE '✅ CREDIT OK'
    END as credit_diff_check

FROM print_preview
ORDER BY account_type, code
LIMIT 30;

-- Print totals validation
WITH gl_summary_base AS (
    SELECT 
        s.account_id,
        s.closing_debit,
        s.closing_credit,
        s.period_debits,
        s.period_credits
    FROM public.get_gl_account_summary(
        '2024-01-01'::date,
        CURRENT_DATE::date,
        'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,
        NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    ) s
    WHERE s.closing_debit != 0 OR s.closing_credit != 0
),
root_totals AS (
    SELECT 
        a.code,
        a.name,
        COALESCE(gl.closing_debit, 0) as closing_debit,
        COALESCE(gl.closing_credit, 0) as closing_credit,
        COALESCE(gl.period_debits, 0) as period_debits,
        COALESCE(gl.period_credits, 0) as period_credits
    FROM accounts a
    LEFT JOIN gl_summary_base gl ON a.id = gl.account_id
    WHERE a.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
      AND a.parent_id IS NULL
)

SELECT 
    '📊 PRINT TOTALS SUMMARY' as validation_type,
    
    -- What print function will show as grand totals
    TO_CHAR(SUM(closing_debit), 'FM999,999,999,990.00') as print_total_debits,
    TO_CHAR(SUM(closing_credit), 'FM999,999,999,990.00') as print_total_credits,
    TO_CHAR(ABS(SUM(closing_debit) - SUM(closing_credit)), 'FM999,999,999,990.00') as print_difference,
    
    -- Alternative totals for comparison
    TO_CHAR(SUM(period_debits), 'FM999,999,999,990.00') as period_total_debits,
    TO_CHAR(SUM(period_credits), 'FM999,999,999,990.00') as period_total_credits,
    
    -- Balance validation
    CASE 
        WHEN ABS(SUM(closing_debit) - SUM(closing_credit)) < 0.01 
        THEN '✅ PRINT WILL SHOW BALANCED'
        ELSE '❌ PRINT WILL SHOW UNBALANCED'
    END as print_balance_status,
    
    -- Consistency check
    CASE 
        WHEN ABS(SUM(closing_debit) - SUM(period_debits)) < 0.01 
             AND ABS(SUM(closing_credit) - SUM(period_credits)) < 0.01
        THEN '✅ CLOSING = PERIOD TOTALS'
        ELSE '⚠️ CLOSING ≠ PERIOD TOTALS'
    END as totals_consistency

FROM root_totals;

-- Hierarchy validation for print
WITH account_hierarchy AS (
    SELECT 
        a.id,
        a.code,
        a.name,
        a.parent_id,
        a.level
    FROM accounts a
    WHERE a.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
)

SELECT 
    '🌳 HIERARCHY PRINT STRUCTURE' as structure_type,
    
    -- Root accounts that will show as main groups in print
    (SELECT COUNT(*) FROM account_hierarchy WHERE parent_id IS NULL) as root_groups_count,
    
    -- Child accounts that will show indented in print
    (SELECT COUNT(*) FROM account_hierarchy WHERE parent_id IS NOT NULL) as child_accounts_count,
    
    -- Maximum depth for print indentation
    (SELECT MAX(level) FROM account_hierarchy) as max_depth_level,
    
    -- Print structure validation
    CASE 
        WHEN (SELECT COUNT(*) FROM account_hierarchy WHERE parent_id IS NULL) > 0
        THEN '✅ ROOT GROUPS EXIST FOR PRINT'
        ELSE '❌ NO ROOT GROUPS - PRINT MAY FAIL'
    END as print_structure_status;
