-- Test if org_id filtering is the issue
-- Copy and paste this SQL block to test with org filtering

-- First, identify what org_id values exist
SELECT 
    'Organization ID Analysis' as test_name,
    org_id,
    COUNT(*) as account_count
FROM accounts 
GROUP BY org_id
ORDER BY org_id NULLS FIRST;

-- Test Trial Balance with org_id filtering (if needed)
WITH trial_balance_with_org AS (
    SELECT 
        a.id as account_id,
        a.code,
        a.name,
        a.org_id,
        COALESCE(SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0) as tb_debit,
        COALESCE(SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0) as tb_credit
    FROM accounts a
    LEFT JOIN transactions t ON (
        (t.debit_account_id = a.id OR t.credit_account_id = a.id)
        AND t.entry_date >= '2024-01-01'
        AND t.entry_date <= CURRENT_DATE
        AND (a.org_id IS NULL OR t.org_id = a.org_id)  -- Match org filtering
    )
    GROUP BY a.id, a.code, a.name, a.org_id
)
SELECT 
    'Trial Balance by Org' as test_name,
    org_id,
    COUNT(*) as active_accounts,
    SUM(tb_debit) as total_debits,
    SUM(tb_credit) as total_credits,
    ABS(SUM(tb_debit) - SUM(tb_credit)) as balance_difference
FROM trial_balance_with_org
WHERE tb_debit != 0 OR tb_credit != 0
GROUP BY org_id
ORDER BY org_id NULLS FIRST;

-- Get the first valid org_id for testing
SELECT 
    'Get Valid Org ID' as test_name,
    org_id
FROM accounts 
WHERE org_id IS NOT NULL 
LIMIT 1;
