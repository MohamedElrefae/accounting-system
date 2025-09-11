-- Debug Trial Balance All Levels account hierarchy and rollup calculations
-- Copy and paste this SQL block

-- Step 1: HIERARCHY ANALYSIS
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
    WHERE s.closing_debit != 0 OR s.closing_credit != 0
),
account_hierarchy AS (
    SELECT 
        a.id,
        a.code,
        a.name,
        a.parent_id,
        a.level,
        a.category,
        COALESCE(gl.closing_debit, 0) as closing_debit,
        COALESCE(gl.closing_credit, 0) as closing_credit,
        (COALESCE(gl.closing_debit, 0) + COALESCE(gl.closing_credit, 0)) as total_activity
    FROM accounts a
    LEFT JOIN gl_summary_base gl ON a.id = gl.account_id
    WHERE a.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
),
root_accounts AS (
    SELECT * FROM account_hierarchy WHERE parent_id IS NULL
),
accounts_with_activity AS (
    SELECT * FROM account_hierarchy WHERE total_activity > 0
)
SELECT 
    '📊 HIERARCHY ANALYSIS' as analysis_type,
    (SELECT COUNT(*) FROM account_hierarchy) as total_accounts,
    (SELECT COUNT(*) FROM root_accounts) as root_accounts_count,
    (SELECT COUNT(*) FROM account_hierarchy WHERE level = 1) as level_1_accounts,
    (SELECT COUNT(*) FROM accounts_with_activity) as accounts_with_activity,
    (SELECT SUM(total_activity) FROM accounts_with_activity) as total_activity_sum;

-- Step 2: ROOT ACCOUNT BREAKDOWN  
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
account_hierarchy AS (
    SELECT 
        a.id,
        a.code,
        a.name,
        a.parent_id,
        a.level,
        a.category,
        COALESCE(gl.closing_debit, 0) as closing_debit,
        COALESCE(gl.closing_credit, 0) as closing_credit,
        (COALESCE(gl.closing_debit, 0) + COALESCE(gl.closing_credit, 0)) as total_activity
    FROM accounts a
    LEFT JOIN gl_summary_base gl ON a.id = gl.account_id
    WHERE a.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
)
SELECT 
    '🔹 ROOT ACCOUNTS' as section,
    code,
    name,
    level,
    category,
    closing_debit,
    closing_credit,
    total_activity,
    
    -- Check if this account has children
    (SELECT COUNT(*) FROM account_hierarchy child WHERE child.parent_id = account_hierarchy.id) as child_count,
    
    -- Calculate children's total activity
    (SELECT COALESCE(SUM(
        COALESCE((SELECT SUM(gl2.closing_debit + gl2.closing_credit) 
                 FROM public.get_gl_account_summary(
                     '2024-01-01'::date, CURRENT_DATE::date, 
                     'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,
                     NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
                 ) gl2 WHERE gl2.account_id = child.id), 0)
    ), 0) FROM account_hierarchy child WHERE child.parent_id = account_hierarchy.id) as children_total_activity

FROM account_hierarchy
WHERE parent_id IS NULL
ORDER BY code;

-- Step 3: ACCOUNT TYPE CLASSIFICATION
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
accounts_with_activity AS (
    SELECT 
        a.code,
        COALESCE(gl.closing_debit, 0) as closing_debit,
        COALESCE(gl.closing_credit, 0) as closing_credit,
        (COALESCE(gl.closing_debit, 0) + COALESCE(gl.closing_credit, 0)) as total_activity
    FROM accounts a
    LEFT JOIN gl_summary_base gl ON a.id = gl.account_id
    WHERE a.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
      AND (COALESCE(gl.closing_debit, 0) + COALESCE(gl.closing_credit, 0)) > 0
)
SELECT 
    '📈 ACCOUNT TYPE BREAKDOWN' as section,
    CASE 
        WHEN LEFT(code, 1) = '1' THEN 'Assets (الأصول)'
        WHEN LEFT(code, 1) = '2' THEN 'Liabilities (الخصوم)'
        WHEN LEFT(code, 1) = '3' THEN 'Equity (حقوق الملكية)'
        WHEN LEFT(code, 1) = '4' THEN 'Revenue (الإيرادات)'
        WHEN LEFT(code, 1) = '5' THEN 'Expenses (التكاليف والمصروفات)'
        ELSE 'Other'
    END as account_type,
    COUNT(*) as account_count,
    SUM(closing_debit) as type_total_debit,
    SUM(closing_credit) as type_total_credit,
    SUM(total_activity) as type_total_activity

FROM accounts_with_activity
GROUP BY LEFT(code, 1)
ORDER BY LEFT(code, 1);

-- Step 4: DETAILED ACCOUNT LIST (with hierarchy)
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
accounts_with_activity AS (
    SELECT 
        a.id,
        a.code,
        a.name,
        a.level,
        a.parent_id,
        COALESCE(gl.closing_debit, 0) as closing_debit,
        COALESCE(gl.closing_credit, 0) as closing_credit,
        (COALESCE(gl.closing_debit, 0) + COALESCE(gl.closing_credit, 0)) as total_activity
    FROM accounts a
    LEFT JOIN gl_summary_base gl ON a.id = gl.account_id
    WHERE a.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
      AND (COALESCE(gl.closing_debit, 0) + COALESCE(gl.closing_credit, 0)) > 0
)
SELECT 
    '📋 ACCOUNT DETAILS' as section,
    CASE 
        WHEN parent_id IS NULL THEN '🔹 ROOT'
        ELSE '  └─ CHILD'
    END as hierarchy_indicator,
    code,
    name,
    level,
    parent_id,
    closing_debit,
    closing_credit,
    total_activity,
    CASE 
        WHEN LEFT(code, 1) = '1' THEN 'Assets'
        WHEN LEFT(code, 1) = '2' THEN 'Liabilities'
        WHEN LEFT(code, 1) = '3' THEN 'Equity'
        WHEN LEFT(code, 1) = '4' THEN 'Revenue'
        WHEN LEFT(code, 1) = '5' THEN 'Expenses'
        ELSE 'Other'
    END as account_type

FROM accounts_with_activity
ORDER BY code
LIMIT 20;
