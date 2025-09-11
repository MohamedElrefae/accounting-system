-- Fixed diagnostic to see exact differences between reports
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
),
trial_balance_current AS (
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
balance_sheet_current AS (
    SELECT 
        account_code,
        account_name_en,
        ABS(COALESCE(closing_debit, 0) - COALESCE(closing_credit, 0)) as bs_amount,
        CASE 
            WHEN LEFT(account_code, 1) = '1' THEN 'assets'
            WHEN LEFT(account_code, 1) = '2' THEN 'liabilities'
            WHEN LEFT(account_code, 1) = '3' THEN 'equity'
        END as bs_account_type
    FROM gl_summary_base
    WHERE LEFT(account_code, 1) IN ('1', '2', '3')
    AND ABS(COALESCE(closing_debit, 0) - COALESCE(closing_credit, 0)) > 0.01
),
profit_loss_current AS (
    SELECT 
        account_code,
        account_name_en,
        COALESCE(period_debits, 0) + COALESCE(period_credits, 0) as pl_amount,
        CASE 
            WHEN LEFT(account_code, 1) = '4' THEN 'revenue'
            WHEN LEFT(account_code, 1) = '5' THEN 'expenses'
        END as pl_account_type
    FROM gl_summary_base
    WHERE LEFT(account_code, 1) IN ('4', '5')
    AND (COALESCE(period_debits, 0) + COALESCE(period_credits, 0)) > 0.01
)

-- SHOW ACCOUNT-LEVEL DIFFERENCES
SELECT 
    'ACCOUNT DIFFERENCES' as section,
    tb.account_code,
    tb.account_name_en,
    tb.account_type,
    tb.tb_debit,
    tb.tb_credit,
    (tb.tb_debit + tb.tb_credit) as tb_total_activity,
    
    -- Balance Sheet comparison (for Balance Sheet accounts)
    CASE 
        WHEN tb.account_type IN ('assets', 'liabilities', 'equity') 
        THEN COALESCE(bs.bs_amount, 0)
        ELSE NULL
    END as bs_amount,
    
    -- P&L comparison (for P&L accounts)
    CASE 
        WHEN tb.account_type IN ('revenue', 'expenses')
        THEN COALESCE(pl.pl_amount, 0)
        ELSE NULL
    END as pl_amount,
    
    -- Consistency flags
    CASE 
        WHEN tb.account_type IN ('assets', 'liabilities', 'equity') THEN
            CASE 
                WHEN COALESCE(bs.bs_amount, 0) = 0 THEN '❌ MISSING FROM BS'
                WHEN ABS((tb.tb_debit + tb.tb_credit) - bs.bs_amount) < 0.01 THEN '✅ BS MATCH'
                ELSE '❌ BS DIFFER'
            END
        WHEN tb.account_type IN ('revenue', 'expenses') THEN
            CASE 
                WHEN COALESCE(pl.pl_amount, 0) = 0 THEN '❌ MISSING FROM PL'
                WHEN ABS((tb.tb_debit + tb.tb_credit) - pl.pl_amount) < 0.01 THEN '✅ PL MATCH'
                ELSE '❌ PL DIFFER'
            END
        ELSE '➖ NOT BS/PL'
    END as match_status

FROM trial_balance_current tb
LEFT JOIN balance_sheet_current bs ON tb.account_code = bs.account_code
LEFT JOIN profit_loss_current pl ON tb.account_code = pl.account_code
ORDER BY tb.account_code;

-- SUMMARY TOTALS COMPARISON
SELECT 
    'TOTALS COMPARISON' as comparison_type,
    
    -- Trial Balance
    (SELECT COUNT(*) FROM trial_balance_current) as tb_accounts,
    (SELECT SUM(tb_debit) FROM trial_balance_current) as tb_debits,
    (SELECT SUM(tb_credit) FROM trial_balance_current) as tb_credits,
    
    -- Balance Sheet  
    (SELECT COUNT(*) FROM balance_sheet_current) as bs_accounts,
    (SELECT SUM(bs_amount) FROM balance_sheet_current) as bs_total,
    (SELECT SUM(bs_amount) FROM balance_sheet_current WHERE bs_account_type = 'assets') as bs_assets,
    (SELECT SUM(bs_amount) FROM balance_sheet_current WHERE bs_account_type = 'liabilities') as bs_liabilities,
    (SELECT SUM(bs_amount) FROM balance_sheet_current WHERE bs_account_type = 'equity') as bs_equity,
    
    -- P&L
    (SELECT COUNT(*) FROM profit_loss_current) as pl_accounts, 
    (SELECT SUM(pl_amount) FROM profit_loss_current) as pl_total,
    (SELECT SUM(pl_amount) FROM profit_loss_current WHERE pl_account_type = 'revenue') as pl_revenue,
    (SELECT SUM(pl_amount) FROM profit_loss_current WHERE pl_account_type = 'expenses') as pl_expenses;
