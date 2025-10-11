-- Check Current Fiscal Management Schema Status
-- Run this to see what's already implemented from your plan

-- 1. Check if fiscal management tables exist
SELECT 
    'fiscal_years' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fiscal_years') 
        THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'fiscal_periods' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fiscal_periods') 
        THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'period_closing_checklists' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'period_closing_checklists') 
        THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'opening_balances' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opening_balances') 
        THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'opening_balance_imports' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opening_balance_imports') 
        THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'opening_balance_validation_rules' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opening_balance_validation_rules') 
        THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'balance_reconciliations' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'balance_reconciliations') 
        THEN 'EXISTS' ELSE 'MISSING' END as status;

-- 2. Check fiscal management functions
SELECT 
    'create_fiscal_year' as function_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'create_fiscal_year') 
        THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'close_fiscal_period' as function_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'close_fiscal_period') 
        THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'validate_opening_balances' as function_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'validate_opening_balances') 
        THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'import_opening_balances' as function_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'import_opening_balances') 
        THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'validate_construction_opening_balances' as function_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'validate_construction_opening_balances') 
        THEN 'EXISTS' ELSE 'MISSING' END as status;

-- 3. Check RLS policies for fiscal tables
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('fiscal_years', 'fiscal_periods', 'opening_balances', 'opening_balance_imports', 'balance_reconciliations')
ORDER BY tablename, policyname;

-- 4. Show current data in fiscal tables (if they exist)
DO $$
DECLARE
    table_exists boolean;
BEGIN
    -- Check fiscal_years data
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fiscal_years') INTO table_exists;
    IF table_exists THEN
        RAISE NOTICE 'FISCAL YEARS TABLE DATA:';
        PERFORM 1; -- Just to show this section exists
    ELSE
        RAISE NOTICE 'fiscal_years table does not exist';
    END IF;
END $$;

-- If fiscal_years exists, show its content
SELECT 
    'fiscal_years' as table_name,
    COUNT(*) as row_count
FROM fiscal_years
WHERE 1=1; -- This will fail if table doesn't exist, but that's expected

-- Same for fiscal_periods
SELECT 
    'fiscal_periods' as table_name,
    COUNT(*) as row_count
FROM fiscal_periods
WHERE 1=1;

-- Same for opening_balances
SELECT 
    'opening_balances' as table_name,
    COUNT(*) as row_count
FROM opening_balances
WHERE 1=1;

-- 5. Show migration files that should have been applied
SELECT 
    'Migration Status Check' as info,
    'Please manually verify these migrations have been applied:' as instructions;

SELECT 
    '20250922_p1_02_fiscal_years.sql' as migration_file,
    'Creates fiscal_years table' as description
UNION ALL
SELECT 
    '20250922_p1_03_fiscal_periods.sql' as migration_file,
    'Creates fiscal_periods table' as description
UNION ALL
SELECT 
    '20250922_p1_04_period_closing_checklists.sql' as migration_file,
    'Creates period_closing_checklists table' as description
UNION ALL
SELECT 
    '20250922_p1_05_opening_balance_imports.sql' as migration_file,
    'Creates opening_balance_imports table' as description
UNION ALL
SELECT 
    '20250922_p1_06_opening_balances.sql' as migration_file,
    'Creates opening_balances table' as description
UNION ALL
SELECT 
    '20250922_p1_07_validation_rules.sql' as migration_file,
    'Creates opening_balance_validation_rules table' as description
UNION ALL
SELECT 
    '20250922_p1_08_balance_reconciliations.sql' as migration_file,
    'Creates balance_reconciliations table' as description
UNION ALL
SELECT 
    '20250922_p1_09_functions.sql' as migration_file,
    'Creates fiscal management functions' as description;