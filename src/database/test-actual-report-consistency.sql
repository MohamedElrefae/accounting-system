-- Test actual consistency between Trial Balance Original and other financial reports
-- Copy and paste this SQL block to check if reports actually match

WITH gl_summary_base AS (
    -- Single GL Summary call for all reports
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
),
trial_balance_current AS (
    -- How Trial Balance Original ACTUALLY works now
    SELECT 
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
trial_balance_all_levels_current AS (
    -- How Trial Balance All Levels ACTUALLY works
    SELECT 
        account_code,
        account_name_en,
        closing_debit as tbal_debit,
        closing_credit as tbal_credit,
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
balance_sheet_current AS (
    -- How Balance Sheet ACTUALLY works now
    SELECT 
        account_code,
        account_name_en,
        -- Updated BS logic: net balance absolute value
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
profit_loss_current AS (
    -- How P&L ACTUALLY works now  
    SELECT 
        account_code,
        account_name_en,
        -- Updated PL logic: period activity
        (period_debits || 0) + (period_credits || 0) as pl_amount,
        CASE 
            WHEN LEFT(account_code, 1) = '4' THEN 'revenue'
            WHEN LEFT(account_code, 1) = '5' THEN 'expenses'
        END as pl_account_type
    FROM gl_summary_base
    WHERE LEFT(account_code, 1) IN ('4', '5')
    AND ((period_debits || 0) + (period_credits || 0)) > 0.01
)

-- DETAILED CONSISTENCY CHECK
SELECT 
    'REPORT CONSISTENCY ANALYSIS' as analysis_type,
    
    -- Trial Balance Original totals
    (SELECT COUNT(*) FROM trial_balance_current) as tb_orig_accounts,
    (SELECT SUM(tb_debit) FROM trial_balance_current) as tb_orig_total_debits,
    (SELECT SUM(tb_credit) FROM trial_balance_current) as tb_orig_total_credits,
    
    -- Trial Balance All Levels totals  
    (SELECT COUNT(*) FROM trial_balance_all_levels_current) as tb_all_accounts,
    (SELECT SUM(tbal_debit) FROM trial_balance_all_levels_current) as tb_all_total_debits,
    (SELECT SUM(tbal_credit) FROM trial_balance_all_levels_current) as tb_all_total_credits,
    
    -- Balance Sheet totals
    (SELECT COUNT(*) FROM balance_sheet_current) as bs_accounts,
    (SELECT SUM(bs_amount) FROM balance_sheet_current WHERE bs_account_type = 'assets') as bs_total_assets,
    (SELECT SUM(bs_amount) FROM balance_sheet_current WHERE bs_account_type = 'liabilities') as bs_total_liabilities,
    (SELECT SUM(bs_amount) FROM balance_sheet_current WHERE bs_account_type = 'equity') as bs_total_equity,
    
    -- P&L totals
    (SELECT COUNT(*) FROM profit_loss_current) as pl_accounts,
    (SELECT SUM(pl_amount) FROM profit_loss_current WHERE pl_account_type = 'revenue') as pl_total_revenue,
    (SELECT SUM(pl_amount) FROM profit_loss_current WHERE pl_account_type = 'expenses') as pl_total_expenses,
    
    -- CONSISTENCY FLAGS
    CASE 
        WHEN (SELECT COUNT(*) FROM trial_balance_current) = (SELECT COUNT(*) FROM trial_balance_all_levels_current)
        THEN '✅ TB ACCOUNTS MATCH'
        ELSE '❌ TB ACCOUNTS DIFFER'
    END as tb_account_consistency,
    
    CASE 
        WHEN ABS((SELECT SUM(tb_debit) FROM trial_balance_current) - (SELECT SUM(tbal_debit) FROM trial_balance_all_levels_current)) < 0.01
        THEN '✅ TB DEBITS MATCH'
        ELSE '❌ TB DEBITS DIFFER'
    END as tb_debit_consistency,
    
    CASE 
        WHEN ABS((SELECT SUM(tb_credit) FROM trial_balance_current) - (SELECT SUM(tbal_credit) FROM trial_balance_all_levels_current)) < 0.01
        THEN '✅ TB CREDITS MATCH'
        ELSE '❌ TB CREDITS DIFFER'
    END as tb_credit_consistency;

-- Show specific account differences
SELECT 
    'ACCOUNT-LEVEL DIFFERENCES' as section,
    tb.account_code,
    tb.account_name_en,
    tb.account_type,
    tb.tb_debit as trial_balance_debit,
    tb.tb_credit as trial_balance_credit,
    
    -- Compare to Balance Sheet (for BS accounts)
    CASE 
        WHEN tb.account_type IN ('assets', 'liabilities', 'equity') 
        THEN COALESCE(bs.bs_amount, 0)
        ELSE NULL
    END as balance_sheet_amount,
    
    -- Compare to P&L (for PL accounts)  
    CASE 
        WHEN tb.account_type IN ('revenue', 'expenses')
        THEN COALESCE(pl.pl_amount, 0)
        ELSE NULL
    END as profit_loss_amount,
    
    -- Flag mismatches
    CASE 
        WHEN tb.account_type IN ('assets', 'liabilities', 'equity') THEN
            CASE 
                WHEN ABS((tb.tb_debit + tb.tb_credit) - COALESCE(bs.bs_amount, 0)) < 0.01 THEN '✅'
                ELSE '❌ BS MISMATCH'
            END
        WHEN tb.account_type IN ('revenue', 'expenses') THEN
            CASE 
                WHEN ABS((tb.tb_debit + tb.tb_credit) - COALESCE(pl.pl_amount, 0)) < 0.01 THEN '✅'
                ELSE '❌ PL MISMATCH'
            END
        ELSE '➖'
    END as consistency_flag

FROM trial_balance_current tb
LEFT JOIN balance_sheet_current bs ON tb.account_code = bs.account_code
LEFT JOIN profit_loss_current pl ON tb.account_code = pl.account_code
ORDER BY tb.account_code
LIMIT 15;
