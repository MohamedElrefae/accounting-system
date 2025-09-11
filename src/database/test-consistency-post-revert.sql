-- Test balance consistency between Trial Balance Original (now reverted) and GL Summary
-- Copy and paste this SQL block to verify the fix

WITH trial_balance_calculation AS (
    -- Replicate the reverted Trial Balance Original logic
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
gl_summary AS (
    -- GL Summary stored procedure logic
    SELECT 
        account_id,
        account_code,
        account_name,
        closing_debit,
        closing_credit
    FROM gl_summary('2024-01-01'::date, CURRENT_DATE::date)
),
comparison AS (
    SELECT 
        tb.account_id,
        tb.code,
        tb.name,
        tb.tb_debit,
        tb.tb_credit,
        gl.closing_debit as gl_debit,
        gl.closing_credit as gl_credit,
        CASE 
            WHEN ABS(tb.tb_debit - COALESCE(gl.closing_debit, 0)) < 0.01 
                AND ABS(tb.tb_credit - COALESCE(gl.closing_credit, 0)) < 0.01 
            THEN 'MATCH'
            ELSE 'DIFFER'
        END as status,
        ABS(tb.tb_debit - COALESCE(gl.closing_debit, 0)) as debit_diff,
        ABS(tb.tb_credit - COALESCE(gl.closing_credit, 0)) as credit_diff
    FROM trial_balance_calculation tb
    FULL OUTER JOIN gl_summary gl ON tb.account_id = gl.account_id
    WHERE (tb.tb_debit != 0 OR tb.tb_credit != 0 OR gl.closing_debit != 0 OR gl.closing_credit != 0)
)
SELECT 
    -- Summary Report
    COUNT(*) as total_accounts_tested,
    COUNT(CASE WHEN status = 'MATCH' THEN 1 END) as matching_accounts,
    COUNT(CASE WHEN status = 'DIFFER' THEN 1 END) as differing_accounts,
    ROUND(
        COUNT(CASE WHEN status = 'MATCH' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 
        1
    ) as consistency_percentage,
    MAX(debit_diff + credit_diff) as max_difference,
    SUM(tb_debit) as total_tb_debits,
    SUM(tb_credit) as total_tb_credits,
    SUM(gl_debit) as total_gl_debits, 
    SUM(gl_credit) as total_gl_credits
FROM comparison;

-- Detailed breakdown of any differences
SELECT 
    code,
    name,
    tb_debit,
    tb_credit,
    gl_debit,
    gl_credit,
    debit_diff,
    credit_diff,
    status
FROM comparison
WHERE status = 'DIFFER'
ORDER BY (debit_diff + credit_diff) DESC
LIMIT 10;
