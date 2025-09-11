-- Debug Trial Balance All Levels rollup calculations step by step
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
        s.closing_credit,
        (s.closing_debit + s.closing_credit) as total_activity
    FROM public.get_gl_account_summary(
        '2024-01-01'::date,
        CURRENT_DATE::date,
        'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,
        NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    ) s
    WHERE s.closing_debit != 0 OR s.closing_credit != 0
),
account_hierarchy AS (
    SELECT 
        a.id,
        a.code,
        a.name,
        a.name_ar,
        a.parent_id,
        a.level,
        a.category,
        COALESCE(gl.opening_debit, 0) as opening_debit,
        COALESCE(gl.opening_credit, 0) as opening_credit,
        COALESCE(gl.period_debits, 0) as period_debits,
        COALESCE(gl.period_credits, 0) as period_credits,
        COALESCE(gl.closing_debit, 0) as closing_debit,
        COALESCE(gl.closing_credit, 0) as closing_credit,
        COALESCE(gl.total_activity, 0) as total_activity
    FROM accounts a
    LEFT JOIN gl_summary_base gl ON a.id = gl.account_id
    WHERE a.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
    ORDER BY a.code
),
-- Recursive CTE to calculate rollup amounts properly
RECURSIVE account_rollup AS (
    -- Base case: leaf nodes (no children)
    SELECT 
        id,
        code,
        name,
        name_ar,
        parent_id,
        level,
        opening_debit,
        opening_credit,
        period_debits,
        period_credits,
        closing_debit,
        closing_credit,
        -- For leaf nodes, rollup amounts equal their own amounts
        opening_debit as rollup_opening_debit,
        opening_credit as rollup_opening_credit,
        period_debits as rollup_period_debits,
        period_credits as rollup_period_credits,
        closing_debit as rollup_closing_debit,
        closing_credit as rollup_closing_credit,
        0 as depth
    FROM account_hierarchy
    WHERE id NOT IN (
        SELECT DISTINCT parent_id 
        FROM account_hierarchy 
        WHERE parent_id IS NOT NULL
    )
    
    UNION ALL
    
    -- Recursive case: parent nodes sum their children's rollup amounts
    SELECT 
        p.id,
        p.code,
        p.name,
        p.name_ar,
        p.parent_id,
        p.level,
        p.opening_debit,
        p.opening_credit,
        p.period_debits,
        p.period_credits,
        p.closing_debit,
        p.closing_credit,
        -- Sum children's rollup amounts plus own amounts
        (p.opening_debit + COALESCE(SUM(c.rollup_opening_debit), 0)) as rollup_opening_debit,
        (p.opening_credit + COALESCE(SUM(c.rollup_opening_credit), 0)) as rollup_opening_credit,
        (p.period_debits + COALESCE(SUM(c.rollup_period_debits), 0)) as rollup_period_debits,
        (p.period_credits + COALESCE(SUM(c.rollup_period_credits), 0)) as rollup_period_credits,
        (p.closing_debit + COALESCE(SUM(c.rollup_closing_debit), 0)) as rollup_closing_debit,
        (p.closing_credit + COALESCE(SUM(c.rollup_closing_credit), 0)) as rollup_closing_credit,
        MAX(c.depth) + 1 as depth
    FROM account_hierarchy p
    JOIN account_rollup c ON c.parent_id = p.id
    GROUP BY p.id, p.code, p.name, p.name_ar, p.parent_id, p.level, 
             p.opening_debit, p.opening_credit, p.period_debits, p.period_credits,
             p.closing_debit, p.closing_credit
)

-- Main analysis query
SELECT 
    '🔍 ROLLUP ANALYSIS' as section,
    code,
    name,
    CASE WHEN name_ar IS NOT NULL THEN name_ar ELSE name END as display_name,
    level,
    parent_id,
    
    -- Own amounts (direct from GL summary)
    opening_debit as own_opening_debit,
    opening_credit as own_opening_credit,
    period_debits as own_period_debits,
    period_credits as own_period_credits,
    closing_debit as own_closing_debit,
    closing_credit as own_closing_credit,
    
    -- Calculated rollup amounts (including children)
    rollup_opening_debit,
    rollup_opening_credit,
    rollup_period_debits,
    rollup_period_credits,
    rollup_closing_debit,
    rollup_closing_credit,
    
    -- Differences (should show children contributions)
    (rollup_closing_debit - closing_debit) as children_closing_debit,
    (rollup_closing_credit - closing_credit) as children_closing_credit,
    
    -- Check if this account has children
    (SELECT COUNT(*) FROM account_hierarchy child WHERE child.parent_id = account_rollup.id) as child_count,
    
    -- Balance check
    CASE 
        WHEN ABS(rollup_closing_debit - rollup_closing_credit) < 0.01 THEN '✅ BALANCED'
        ELSE '❌ UNBALANCED: ' || ABS(rollup_closing_debit - rollup_closing_credit)::text
    END as balance_status

FROM account_rollup
WHERE rollup_closing_debit > 0 OR rollup_closing_credit > 0
ORDER BY code
LIMIT 20;

-- Summary totals comparison
WITH gl_summary_base AS (
    SELECT 
        s.account_id,
        s.closing_debit,
        s.closing_credit
    FROM public.get_gl_account_summary(
        '2024-01-01'::date,
        CURRENT_DATE::date,
        'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,
        NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    ) s
    WHERE s.closing_debit != 0 OR s.closing_credit != 0
),
root_accounts AS (
    SELECT 
        a.id,
        a.code,
        a.name,
        COALESCE(gl.closing_debit, 0) as closing_debit,
        COALESCE(gl.closing_credit, 0) as closing_credit
    FROM accounts a
    LEFT JOIN gl_summary_base gl ON a.id = gl.account_id
    WHERE a.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
      AND a.parent_id IS NULL
)

SELECT 
    '📊 TOTALS COMPARISON' as section,
    
    -- Root accounts totals (what should show in UI)
    (SELECT SUM(closing_debit) FROM root_accounts) as root_total_debit,
    (SELECT SUM(closing_credit) FROM root_accounts) as root_total_credit,
    
    -- All accounts totals (from GL summary directly)
    (SELECT SUM(closing_debit) FROM gl_summary_base) as all_accounts_total_debit,
    (SELECT SUM(closing_credit) FROM gl_summary_base) as all_accounts_total_credit,
    
    -- Balance check
    CASE 
        WHEN ABS((SELECT SUM(closing_debit) FROM root_accounts) - 
                 (SELECT SUM(closing_credit) FROM root_accounts)) < 0.01 
        THEN '✅ ROOT ACCOUNTS BALANCED'
        ELSE '❌ ROOT ACCOUNTS UNBALANCED'
    END as root_balance_status,
    
    CASE 
        WHEN ABS((SELECT SUM(closing_debit) FROM gl_summary_base) - 
                 (SELECT SUM(closing_credit) FROM gl_summary_base)) < 0.01 
        THEN '✅ ALL ACCOUNTS BALANCED'
        ELSE '❌ ALL ACCOUNTS UNBALANCED'
    END as all_balance_status;
