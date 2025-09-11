-- Test balance consistency between Trial Balance Original and direct transaction calculation
-- This version doesn't depend on stored procedures - copy and paste this SQL block

WITH trial_balance_calculation AS (
    -- Replicate the reverted Trial Balance Original logic
    SELECT 
        a.id as account_id,
        a.code,
        a.name,
        a.category,
        COALESCE(SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0) as tb_debit,
        COALESCE(SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0) as tb_credit
    FROM accounts a
    LEFT JOIN transactions t ON (
        (t.debit_account_id = a.id OR t.credit_account_id = a.id)
        AND t.entry_date >= '2024-01-01'
        AND t.entry_date <= CURRENT_DATE
    )
    GROUP BY a.id, a.code, a.name, a.category
),
active_accounts AS (
    -- Filter to accounts with activity
    SELECT *
    FROM trial_balance_calculation
    WHERE tb_debit != 0 OR tb_credit != 0
)
SELECT 
    -- Summary Report
    COUNT(*) as total_accounts_with_activity,
    SUM(tb_debit) as total_debits,
    SUM(tb_credit) as total_credits,
    ABS(SUM(tb_debit) - SUM(tb_credit)) as balance_difference,
    CASE 
        WHEN ABS(SUM(tb_debit) - SUM(tb_credit)) < 0.01 THEN 'BALANCED ✓'
        ELSE 'UNBALANCED ⚠'
    END as balance_status,
    -- Account type breakdown
    COUNT(CASE WHEN LEFT(code, 1) = '1' THEN 1 END) as assets_accounts,
    COUNT(CASE WHEN LEFT(code, 1) = '2' THEN 1 END) as liabilities_accounts,
    COUNT(CASE WHEN LEFT(code, 1) = '3' THEN 1 END) as equity_accounts,
    COUNT(CASE WHEN LEFT(code, 1) = '4' THEN 1 END) as revenue_accounts,
    COUNT(CASE WHEN LEFT(code, 1) = '5' THEN 1 END) as expense_accounts
FROM active_accounts;

-- Detail: Top 10 accounts by activity
SELECT 
    code,
    name,
    category,
    tb_debit,
    tb_credit,
    (tb_debit + tb_credit) as total_activity,
    CASE 
        WHEN LEFT(code, 1) = '1' THEN 'Assets'
        WHEN LEFT(code, 1) = '2' THEN 'Liabilities'
        WHEN LEFT(code, 1) = '3' THEN 'Equity'
        WHEN LEFT(code, 1) = '4' THEN 'Revenue'
        WHEN LEFT(code, 1) = '5' THEN 'Expenses'
        ELSE 'Other'
    END as account_type
FROM active_accounts
ORDER BY (tb_debit + tb_credit) DESC
LIMIT 10;

-- Verification: Check if debits = credits (fundamental accounting equation)
SELECT 
    'Fundamental Balance Check' as test_name,
    SUM(tb_debit) as total_debits,
    SUM(tb_credit) as total_credits,
    SUM(tb_debit) - SUM(tb_credit) as difference,
    CASE 
        WHEN ABS(SUM(tb_debit) - SUM(tb_credit)) < 0.01 THEN '✓ PASS: Books are balanced'
        ELSE '⚠ FAIL: Books are out of balance'
    END as result
FROM active_accounts;
