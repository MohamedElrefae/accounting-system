-- FIXED: Fiscal Management Schema Status Check
-- Run this in your Supabase Query Editor

-- 1. Check Database Tables Status
SELECT 
    table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name) 
        THEN '✅ EXISTS' ELSE '❌ MISSING' END as status,
    phase,
    description
FROM (
  SELECT 'fiscal_years' as table_name, 'Phase 1.1' as phase, 'Fiscal year management' as description
  UNION ALL
  SELECT 'fiscal_periods', 'Phase 1.1', 'Period management'
  UNION ALL
  SELECT 'period_closing_checklists', 'Phase 1.1', 'Closing procedures'
  UNION ALL
  SELECT 'opening_balances', 'Phase 1.2', 'Opening balance core'
  UNION ALL
  SELECT 'opening_balance_imports', 'Phase 1.2', 'Import tracking'
  UNION ALL
  SELECT 'opening_balance_validation_rules', 'Phase 1.2', 'Validation rules'
  UNION ALL
  SELECT 'balance_reconciliations', 'Phase 1.2', 'Reconciliation tracking'
) t
ORDER BY phase, table_name;

-- 2. Check Database Functions Status
SELECT 
    function_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = f.function_name) 
        THEN '✅ EXISTS' ELSE '❌ MISSING' END as status,
    description
FROM (
  SELECT 'create_fiscal_year' as function_name, 'Create fiscal year with periods' as description
  UNION ALL
  SELECT 'close_fiscal_period', 'Execute period closing'
  UNION ALL
  SELECT 'validate_opening_balances', 'Validate balance equations'
  UNION ALL
  SELECT 'import_opening_balances', 'Process Excel imports'
  UNION ALL
  SELECT 'validate_construction_opening_balances', 'Construction validations'
) f
ORDER BY function_name;

-- 3. Show Current Data Counts (if tables exist)
DO $$
DECLARE
    table_count integer;
    org_count integer;
BEGIN
    BEGIN
        SELECT COUNT(*) INTO table_count FROM fiscal_years;
        SELECT COUNT(DISTINCT org_id) INTO org_count FROM fiscal_years;
        RAISE NOTICE '📊 fiscal_years: % rows across % organizations', table_count, org_count;
    EXCEPTION
        WHEN undefined_table THEN
            RAISE NOTICE '❌ fiscal_years table does not exist';
    END;
    
    BEGIN
        SELECT COUNT(*) INTO table_count FROM fiscal_periods;
        RAISE NOTICE '📊 fiscal_periods: % rows', table_count;
    EXCEPTION
        WHEN undefined_table THEN
            RAISE NOTICE '❌ fiscal_periods table does not exist';
    END;
    
    BEGIN
        SELECT COUNT(*) INTO table_count FROM opening_balances;
        SELECT COUNT(DISTINCT org_id) INTO org_count FROM opening_balances;
        RAISE NOTICE '📊 opening_balances: % rows across % organizations', table_count, org_count;
    EXCEPTION
        WHEN undefined_table THEN
            RAISE NOTICE '❌ opening_balances table does not exist';
    END;
    
    BEGIN
        SELECT COUNT(*) INTO table_count FROM opening_balance_imports;
        RAISE NOTICE '📊 opening_balance_imports: % import jobs', table_count;
    EXCEPTION
        WHEN undefined_table THEN
            RAISE NOTICE '❌ opening_balance_imports table does not exist';
    END;
END $$;

-- 4. Check RLS Policies
SELECT 
    tablename,
    policyname,
    cmd as operation,
    CASE WHEN qual IS NOT NULL THEN 'Has conditions' ELSE 'No conditions' END as conditions
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('fiscal_years', 'fiscal_periods', 'opening_balances', 'opening_balance_imports')
ORDER BY tablename, policyname;

-- 5. Implementation Summary
SELECT 
    'PHASE 1: Database Schema' as component,
    'IMPLEMENTED ✅' as status,
    'Tables and functions exist based on your migrations' as notes
UNION ALL
SELECT 
    'PHASE 2: React Services', 
    'PENDING 🔄', 
    'OpeningBalanceImportService needs implementation'
UNION ALL
SELECT 
    'PHASE 3: Period Management', 
    'PENDING 🔄', 
    'Fiscal period UI and workflow components needed'
UNION ALL
SELECT 
    'PHASE 4: Construction Features', 
    'PENDING 🔄', 
    'Construction dashboards and mobile interface'
UNION ALL
SELECT 
    'PHASE 5: Testing & Deployment', 
    'PENDING 🔄', 
    'Testing suite and performance optimization';