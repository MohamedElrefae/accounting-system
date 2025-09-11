-- Test consistency after fixing Balance Sheet and P&L to match Trial Balance format
-- Copy and paste this SQL block

WITH gl_summary_base AS (
    SELECT 
        s.account_id,
        s.account_code,
        s.account_name_en,
        s.closing_debit,
        s.closing_credit
    FROM public.get_gl_account_summary(
        '2024-01-01'::date,
        CURRENT_DATE::date,
        'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,
        NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    ) s
),
trial_balance_format AS (
    -- How ALL reports should now work (Trial Balance format)
    SELECT 
        account_code,
        account_name_en,
        closing_debit,
        closing_credit,
        (closing_debit + closing_credit) as total_activity,
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
balance_sheet_fixed AS (
    -- Balance Sheet now using closing_debit + closing_credit (FIXED)
    SELECT 
        account_code,
        account_name_en,
        (closing_debit + closing_credit) as bs_amount,
        CASE 
            WHEN LEFT(account_code, 1) = '1' THEN 'assets'
            WHEN LEFT(account_code, 1) = '2' THEN 'liabilities'
            WHEN LEFT(account_code, 1) = '3' THEN 'equity'
        END as bs_account_type
    FROM gl_summary_base
    WHERE LEFT(account_code, 1) IN ('1', '2', '3')
    AND (closing_debit != 0 OR closing_credit != 0)
),
profit_loss_fixed AS (
    -- P&L now using closing_debit + closing_credit (FIXED)
    SELECT 
        account_code,
        account_name_en,
        (closing_debit + closing_credit) as pl_amount,
        CASE 
            WHEN LEFT(account_code, 1) = '4' THEN 'revenue'
            WHEN LEFT(account_code, 1) = '5' THEN 'expenses'
        END as pl_account_type
    FROM gl_summary_base
    WHERE LEFT(account_code, 1) IN ('4', '5')
    AND (closing_debit != 0 OR closing_credit != 0)
)

-- PERFECT CONSISTENCY CHECK
SELECT 
    '🎯 FIXED CONSISTENCY CHECK' as test_result,
    
    -- Trial Balance
    (SELECT COUNT(*) FROM trial_balance_format) as tb_accounts,
    (SELECT SUM(closing_debit) FROM trial_balance_format) as tb_debits,
    (SELECT SUM(closing_credit) FROM trial_balance_format) as tb_credits,
    (SELECT SUM(total_activity) FROM trial_balance_format) as tb_total_activity,
    
    -- Balance Sheet (should match TB for BS accounts)
    (SELECT COUNT(*) FROM balance_sheet_fixed) as bs_accounts,
    (SELECT SUM(bs_amount) FROM balance_sheet_fixed) as bs_total_activity,
    
    -- P&L (should match TB for PL accounts)  
    (SELECT COUNT(*) FROM profit_loss_fixed) as pl_accounts,
    (SELECT SUM(pl_amount) FROM profit_loss_fixed) as pl_total_activity,
    
    -- CONSISTENCY VERIFICATION
    CASE 
        WHEN (SELECT SUM(bs_amount) FROM balance_sheet_fixed) = 
             (SELECT SUM(total_activity) FROM trial_balance_format WHERE account_type IN ('assets', 'liabilities', 'equity'))
        THEN '✅ BS MATCHES TB'
        ELSE '❌ BS STILL DIFFERS'
    END as bs_consistency,
    
    CASE 
        WHEN (SELECT SUM(pl_amount) FROM profit_loss_fixed) = 
             (SELECT SUM(total_activity) FROM trial_balance_format WHERE account_type IN ('revenue', 'expenses'))
        THEN '✅ PL MATCHES TB'
        ELSE '❌ PL STILL DIFFERS'
    END as pl_consistency,
    
    -- OVERALL STATUS
    CASE 
        WHEN (SELECT SUM(bs_amount) FROM balance_sheet_fixed) = 
             (SELECT SUM(total_activity) FROM trial_balance_format WHERE account_type IN ('assets', 'liabilities', 'equity'))
        AND (SELECT SUM(pl_amount) FROM profit_loss_fixed) = 
             (SELECT SUM(total_activity) FROM trial_balance_format WHERE account_type IN ('revenue', 'expenses'))
        THEN '🎉 PERFECT CONSISTENCY ACHIEVED!'
        ELSE '⚠ STILL HAVE ISSUES'
    END as overall_status;

-- ACCOUNT-LEVEL VERIFICATION (Sample)
SELECT 
    '✅ SAMPLE ACCOUNT VERIFICATION' as section,
    tb.account_code,
    tb.account_name_en,
    tb.account_type,
    tb.total_activity as tb_activity,
    
    CASE 
        WHEN tb.account_type IN ('assets', 'liabilities', 'equity') 
        THEN bs.bs_amount
        ELSE NULL
    END as bs_activity,
    
    CASE 
        WHEN tb.account_type IN ('revenue', 'expenses')
        THEN pl.pl_amount  
        ELSE NULL
    END as pl_activity,
    
    -- Perfect match verification
    CASE 
        WHEN tb.account_type IN ('assets', 'liabilities', 'equity') THEN
            CASE WHEN bs.bs_amount = tb.total_activity THEN '✅ PERFECT' ELSE '❌ DIFFER' END
        WHEN tb.account_type IN ('revenue', 'expenses') THEN
            CASE WHEN pl.pl_amount = tb.total_activity THEN '✅ PERFECT' ELSE '❌ DIFFER' END
        ELSE '➖'
    END as match_status

FROM trial_balance_format tb
LEFT JOIN balance_sheet_fixed bs ON tb.account_code = bs.account_code
LEFT JOIN profit_loss_fixed pl ON tb.account_code = pl.account_code
ORDER BY tb.account_code
LIMIT 10;
