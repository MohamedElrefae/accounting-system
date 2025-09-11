-- Debug GL Summary function vs our Trial Balance logic
-- Copy and paste this SQL block to understand the filtering differences

-- Check what the GL Summary function actually returns in detail
SELECT 
    'GL SUMMARY DETAILED OUTPUT' as test_section,
    s.account_id,
    s.account_code,
    s.account_name_en,
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
    NULL, -- project_id
    false, -- posted_only
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
) s
ORDER BY s.account_code;

-- Check our Trial Balance logic output in detail
WITH our_trial_balance AS (
    SELECT 
        a.id as account_id,
        a.code,
        a.name,
        a.org_id,
        COALESCE(SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0) as tb_debit,
        COALESCE(SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0) as tb_credit,
        COUNT(t.id) as transaction_count
    FROM accounts a
    LEFT JOIN transactions t ON (
        (t.debit_account_id = a.id OR t.credit_account_id = a.id)
        AND t.entry_date >= '2024-01-01'
        AND t.entry_date <= CURRENT_DATE
        AND t.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
    )
    WHERE a.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
    GROUP BY a.id, a.code, a.name, a.org_id
)
SELECT 
    'OUR TRIAL BALANCE OUTPUT' as test_section,
    account_id,
    code,
    name,
    tb_debit,
    tb_credit,
    transaction_count
FROM our_trial_balance
WHERE tb_debit != 0 OR tb_credit != 0
ORDER BY code;

-- Compare transaction filtering scope directly
SELECT 
    'TRANSACTION SCOPE COMPARISON' as test_section,
    
    -- Our filtering
    (SELECT COUNT(*) FROM transactions WHERE org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441' AND entry_date >= '2024-01-01' AND entry_date <= CURRENT_DATE) as our_transaction_count,
    (SELECT SUM(amount) FROM transactions WHERE org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441' AND entry_date >= '2024-01-01' AND entry_date <= CURRENT_DATE) as our_transaction_sum,
    
    -- Check if GL Summary might be using different date logic or additional filters
    (SELECT COUNT(*) FROM transactions WHERE org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441' AND entry_date <= CURRENT_DATE) as gl_potential_count,
    (SELECT SUM(amount) FROM transactions WHERE org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441' AND entry_date <= CURRENT_DATE) as gl_potential_sum,
    
    -- Check posted vs unposted
    (SELECT COUNT(*) FROM transactions WHERE org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441' AND entry_date >= '2024-01-01' AND entry_date <= CURRENT_DATE AND is_posted = true) as our_posted_count,
    (SELECT SUM(amount) FROM transactions WHERE org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441' AND entry_date >= '2024-01-01' AND entry_date <= CURRENT_DATE AND is_posted = true) as our_posted_sum;

-- Check if there are accounts in GL Summary that we don't see
WITH gl_accounts AS (
    SELECT DISTINCT s.account_id
    FROM public.get_gl_account_summary(
        '2024-01-01'::date, CURRENT_DATE::date, 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,
        NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    ) s
    WHERE s.closing_debit != 0 OR s.closing_credit != 0
),
tb_accounts AS (
    SELECT DISTINCT a.id as account_id
    FROM accounts a
    WHERE a.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
)
SELECT 
    'ACCOUNT SCOPE COMPARISON' as test_section,
    (SELECT COUNT(*) FROM gl_accounts) as gl_active_accounts,
    (SELECT COUNT(*) FROM tb_accounts) as tb_available_accounts,
    (SELECT COUNT(*) FROM gl_accounts g WHERE NOT EXISTS (SELECT 1 FROM tb_accounts t WHERE t.account_id = g.account_id)) as accounts_in_gl_not_in_tb,
    (SELECT COUNT(*) FROM tb_accounts t WHERE NOT EXISTS (SELECT 1 FROM gl_accounts g WHERE g.account_id = t.account_id)) as accounts_in_tb_not_in_gl;
