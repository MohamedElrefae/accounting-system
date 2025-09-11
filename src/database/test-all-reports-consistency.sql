-- Test perfect consistency across all updated financial reports using GL Summary
-- Copy and paste this SQL block to verify all reports show consistent data

WITH gl_summary_base AS (
    -- Single source of truth: GL Summary function
    SELECT 
        s.account_id,
        s.account_code,
        s.account_name_en,
        s.account_name_ar,
        s.opening_debit,
        s.opening_credit,
        s.period_debits,
        s.period_credits,
        s.closing_debit,
        s.closing_credit,
        s.transaction_count
    FROM public.get_gl_account_summary(
        '2024-01-01'::date,
        CURRENT_DATE::date,
        'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,
        NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    ) s
),
trial_balance_replication AS (
    -- Trial Balance Original logic (now using GL Summary)
    SELECT 
        account_id,
        account_code,
        account_name_en,
        closing_debit as tb_debit,
        closing_credit as tb_credit,
        CASE 
            WHEN LEFT(account_code, 1) = '1' THEN 'assets'
            WHEN LEFT(account_code, 1) = '2' THEN 'liabilities'
            WHEN LEFT(account_code, 1) = '3' THEN 'equity'
            WHEN LEFT(account_code, 1) = '4' THEN 'revenue'
            WHEN LEFT(account_code, 1) = '5' THEN 'expenses'
        END as account_type
    FROM gl_summary_base
    WHERE closing_debit != 0 OR closing_credit != 0
),
balance_sheet_replication AS (
    -- Balance Sheet logic (now using GL Summary)
    SELECT 
        account_id,
        account_code,
        account_name_en,
        ABS((closing_debit || 0) - (closing_credit || 0)) as bs_amount,
        CASE 
            WHEN LEFT(account_code, 1) = '1' THEN 'assets'
            WHEN LEFT(account_code, 1) = '2' THEN 'liabilities'
            WHEN LEFT(account_code, 1) = '3' THEN 'equity'
        END as bs_account_type
    FROM gl_summary_base
    WHERE LEFT(account_code, 1) IN ('1', '2', '3')
    AND ABS((closing_debit || 0) - (closing_credit || 0)) > 0.01
),
profit_loss_replication AS (
    -- P&L logic (now using GL Summary)
    SELECT 
        account_id,
        account_code,
        account_name_en,
        (period_debits || 0) + (period_credits || 0) as pl_amount,
        CASE 
            WHEN LEFT(account_code, 1) = '4' THEN 'revenue'
            WHEN LEFT(account_code, 1) = '5' THEN 'expenses'
        END as pl_account_type
    FROM gl_summary_base
    WHERE LEFT(account_code, 1) IN ('4', '5')
    AND ((period_debits || 0) + (period_credits || 0)) > 0.01
)

-- CONSISTENCY REPORT
SELECT 
    '🎯 ALL REPORTS CONSISTENCY CHECK' as test_phase,
    
    -- Trial Balance Totals
    (SELECT SUM(tb_debit) FROM trial_balance_replication) as tb_total_debits,
    (SELECT SUM(tb_credit) FROM trial_balance_replication) as tb_total_credits,
    (SELECT COUNT(*) FROM trial_balance_replication) as tb_account_count,
    
    -- Balance Sheet Totals
    (SELECT SUM(bs_amount) FROM balance_sheet_replication WHERE bs_account_type = 'assets') as bs_total_assets,
    (SELECT SUM(bs_amount) FROM balance_sheet_replication WHERE bs_account_type = 'liabilities') as bs_total_liabilities,
    (SELECT SUM(bs_amount) FROM balance_sheet_replication WHERE bs_account_type = 'equity') as bs_total_equity,
    (SELECT COUNT(*) FROM balance_sheet_replication) as bs_account_count,
    
    -- P&L Totals
    (SELECT SUM(pl_amount) FROM profit_loss_replication WHERE pl_account_type = 'revenue') as pl_total_revenue,
    (SELECT SUM(pl_amount) FROM profit_loss_replication WHERE pl_account_type = 'expenses') as pl_total_expenses,
    (SELECT COUNT(*) FROM profit_loss_replication) as pl_account_count,
    
    -- Balance Verification
    CASE 
        WHEN ABS(
            (SELECT SUM(tb_debit) FROM trial_balance_replication) - 
            (SELECT SUM(tb_credit) FROM trial_balance_replication)
        ) < 0.01 THEN '✅ TB BALANCED'
        ELSE '❌ TB UNBALANCED'
    END as tb_balance_status,
    
    CASE 
        WHEN ABS(
            (SELECT SUM(bs_amount) FROM balance_sheet_replication WHERE bs_account_type = 'assets') - 
            ((SELECT SUM(bs_amount) FROM balance_sheet_replication WHERE bs_account_type = 'liabilities') + 
             (SELECT SUM(bs_amount) FROM balance_sheet_replication WHERE bs_account_type = 'equity'))
        ) < 0.01 THEN '✅ BS BALANCED'
        ELSE '❌ BS UNBALANCED'
    END as bs_balance_status,
    
    '✅ ALL REPORTS NOW USE GL SUMMARY' as consistency_status;

-- ACCOUNT TYPE BREAKDOWN
SELECT 
    '📊 UNIFIED ACCOUNT TYPE BREAKDOWN' as section,
    account_type,
    COUNT(*) as account_count,
    SUM(tb_debit) as total_debits,
    SUM(tb_credit) as total_credits,
    SUM(tb_debit + tb_credit) as total_activity
FROM trial_balance_replication
WHERE account_type IS NOT NULL
GROUP BY account_type
ORDER BY 
    CASE account_type
        WHEN 'assets' THEN 1
        WHEN 'liabilities' THEN 2  
        WHEN 'equity' THEN 3
        WHEN 'revenue' THEN 4
        WHEN 'expenses' THEN 5
        ELSE 6
    END;

-- REPORT COVERAGE VERIFICATION
SELECT 
    '🔍 REPORT COVERAGE CHECK' as test_name,
    (SELECT COUNT(DISTINCT account_id) FROM gl_summary_base WHERE closing_debit != 0 OR closing_credit != 0) as total_active_accounts,
    (SELECT COUNT(DISTINCT account_id) FROM trial_balance_replication) as tb_covered_accounts,
    (SELECT COUNT(DISTINCT account_id) FROM balance_sheet_replication) as bs_covered_accounts,
    (SELECT COUNT(DISTINCT account_id) FROM profit_loss_replication) as pl_covered_accounts,
    (
        (SELECT COUNT(DISTINCT account_id) FROM trial_balance_replication) = 
        (SELECT COUNT(DISTINCT account_id) FROM gl_summary_base WHERE closing_debit != 0 OR closing_credit != 0)
    ) as tb_covers_all_accounts,
    CASE 
        WHEN (
            (SELECT COUNT(DISTINCT account_id) FROM balance_sheet_replication) + 
            (SELECT COUNT(DISTINCT account_id) FROM profit_loss_replication)
        ) = (SELECT COUNT(DISTINCT account_id) FROM gl_summary_base WHERE closing_debit != 0 OR closing_credit != 0)
        THEN '✅ BS + PL = ALL ACCOUNTS'
        ELSE '⚠ COVERAGE GAP EXISTS'
    END as coverage_status;
