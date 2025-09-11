-- Test GL Summary with posted_only = true to see if that matches our totals
-- Copy and paste this SQL block

-- Test 1: GL Summary with posted_only = true
SELECT 
    'GL SUMMARY WITH POSTED ONLY' as test_name,
    SUM(s.closing_debit) as total_debits,
    SUM(s.closing_credit) as total_credits,
    COUNT(*) as active_accounts
FROM public.get_gl_account_summary(
    '2024-01-01'::date,
    CURRENT_DATE::date,
    'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,
    NULL, -- project_id
    true, -- posted_only = TRUE
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
) s
WHERE s.closing_debit != 0 OR s.closing_credit != 0;

-- Test 2: Our Trial Balance with posted only
WITH our_tb_posted AS (
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
        AND t.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
        AND t.is_posted = true  -- POSTED ONLY
    )
    WHERE a.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
    GROUP BY a.id, a.code, a.name
)
SELECT 
    'OUR TB WITH POSTED ONLY' as test_name,
    SUM(tb_debit) as total_debits,
    SUM(tb_credit) as total_credits,
    COUNT(*) as active_accounts
FROM our_tb_posted
WHERE tb_debit != 0 OR tb_credit != 0;

-- Test 3: GL Summary with NO date restriction (just org_id)
SELECT 
    'GL SUMMARY NO DATE FILTER' as test_name,
    SUM(s.closing_debit) as total_debits,
    SUM(s.closing_credit) as total_credits,
    COUNT(*) as active_accounts
FROM public.get_gl_account_summary(
    NULL, -- no date_from
    NULL, -- no date_to
    'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,
    NULL, -- project_id
    false, -- posted_only
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
) s
WHERE s.closing_debit != 0 OR s.closing_credit != 0;

-- Test 4: Our TB with no date restriction
WITH our_tb_no_date AS (
    SELECT 
        a.id as account_id,
        a.code,
        a.name,
        COALESCE(SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0) as tb_debit,
        COALESCE(SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0) as tb_credit
    FROM accounts a
    LEFT JOIN transactions t ON (
        (t.debit_account_id = a.id OR t.credit_account_id = a.id)
        AND t.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
        -- NO DATE FILTER
    )
    WHERE a.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
    GROUP BY a.id, a.code, a.name
)
SELECT 
    'OUR TB NO DATE FILTER' as test_name,
    SUM(tb_debit) as total_debits,
    SUM(tb_credit) as total_credits,
    COUNT(*) as active_accounts
FROM our_tb_no_date
WHERE tb_debit != 0 OR tb_credit != 0;
