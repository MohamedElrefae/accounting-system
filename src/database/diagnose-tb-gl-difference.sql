-- Diagnostic query to understand the difference between Trial Balance and GL Summary
-- Copy and paste this SQL block to identify the root cause

-- First, check what transactions each method sees
WITH tb_transactions AS (
    SELECT 
        t.id,
        t.entry_date,
        t.debit_account_id,
        t.credit_account_id,
        t.amount,
        t.is_posted,
        t.org_id,
        t.project_id,
        'TB_SCOPE' as source
    FROM transactions t
    WHERE t.entry_date >= '2024-01-01'
        AND t.entry_date <= CURRENT_DATE
),
gl_expanded AS (
    -- This replicates the GL Summary logic for transaction expansion
    SELECT
        tx.id AS transaction_id,
        tx.entry_date,
        tx.org_id,
        tx.project_id,
        tx.debit_account_id AS account_id,
        tx.amount::numeric AS debit,
        0::numeric AS credit,
        tx.amount::numeric AS signed_amount,
        'GL_DEBIT' as entry_type
    FROM public.transactions tx
    WHERE tx.entry_date <= CURRENT_DATE  -- GL Summary uses <= end date, no start date by default
        AND tx.entry_date >= '2024-01-01'  -- Add start date to match TB
    UNION ALL
    SELECT
        tx.id AS transaction_id,
        tx.entry_date,
        tx.org_id,
        tx.project_id,
        tx.credit_account_id AS account_id,
        0::numeric AS debit,
        tx.amount::numeric AS credit,
        -tx.amount::numeric AS signed_amount,
        'GL_CREDIT' as entry_type
    FROM public.transactions tx
    WHERE tx.entry_date <= CURRENT_DATE  -- GL Summary uses <= end date, no start date by default
        AND tx.entry_date >= '2024-01-01'  -- Add start date to match TB
)

-- Compare transaction counts and amounts
SELECT 
    'Transaction Scope Comparison' as analysis_type,
    
    -- Trial Balance transaction scope
    (SELECT COUNT(*) FROM tb_transactions) as tb_total_transactions,
    (SELECT COUNT(DISTINCT id) FROM tb_transactions) as tb_unique_transactions,
    (SELECT SUM(amount) FROM tb_transactions) as tb_total_amount,
    (SELECT MIN(entry_date) FROM tb_transactions) as tb_min_date,
    (SELECT MAX(entry_date) FROM tb_transactions) as tb_max_date,
    
    -- GL Summary transaction scope
    (SELECT COUNT(*) FROM gl_expanded) as gl_total_entries,
    (SELECT COUNT(DISTINCT transaction_id) FROM gl_expanded) as gl_unique_transactions,
    (SELECT SUM(debit + credit) FROM gl_expanded) as gl_total_amount,
    (SELECT MIN(entry_date) FROM gl_expanded) as gl_min_date,
    (SELECT MAX(entry_date) FROM gl_expanded) as gl_max_date;

-- Check posting status differences
SELECT 
    'Posting Status Analysis' as analysis_type,
    is_posted,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount
FROM transactions t
WHERE t.entry_date >= '2024-01-01'
    AND t.entry_date <= CURRENT_DATE
GROUP BY is_posted
ORDER BY is_posted;

-- Check org_id filtering impact
SELECT 
    'Organization Analysis' as analysis_type,
    org_id,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount
FROM transactions t
WHERE t.entry_date >= '2024-01-01'
    AND t.entry_date <= CURRENT_DATE
GROUP BY org_id
ORDER BY org_id NULLS FIRST;

-- Sample the top accounts by difference
WITH trial_balance_calc AS (
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
    )
    GROUP BY a.id, a.code, a.name
),
gl_summary_data AS (
    SELECT 
        s.account_id,
        s.account_code,
        s.closing_debit,
        s.closing_credit
    FROM public.get_gl_account_summary(
        '2024-01-01'::date,
        CURRENT_DATE::date,
        NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    ) s
)
SELECT 
    'Top Differences' as analysis_type,
    tb.code,
    tb.name,
    tb.tb_debit,
    tb.tb_credit,
    COALESCE(gl.closing_debit, 0) as gl_debit,
    COALESCE(gl.closing_credit, 0) as gl_credit,
    ABS(tb.tb_debit - COALESCE(gl.closing_debit, 0)) + 
    ABS(tb.tb_credit - COALESCE(gl.closing_credit, 0)) as total_difference
FROM trial_balance_calc tb
FULL OUTER JOIN gl_summary_data gl ON tb.account_id = gl.account_id
WHERE (tb.tb_debit != 0 OR tb.tb_credit != 0 OR COALESCE(gl.closing_debit, 0) != 0 OR COALESCE(gl.closing_credit, 0) != 0)
ORDER BY total_difference DESC
LIMIT 5;
