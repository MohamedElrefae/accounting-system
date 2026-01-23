-- ============================================================================
-- FIND ALL REMAINING REFERENCES TO expenses_categories
-- ============================================================================
-- This finds EVERY function, view, trigger, and procedure that references
-- the old expenses_categories table name

-- SECTION 1: Find all functions referencing expenses_categories
-- ============================================================================
SELECT 
  'FUNCTION' as object_type,
  proname as object_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND pg_get_functiondef(oid) LIKE '%expenses_categories%'
ORDER BY proname;

-- SECTION 2: Find all views referencing expenses_categories
-- ============================================================================
SELECT 
  'VIEW' as object_type,
  table_name as object_name,
  view_definition as definition
FROM information_schema.views
WHERE table_schema = 'public'
AND view_definition LIKE '%expenses_categories%'
ORDER BY table_name;

-- SECTION 3: Find all materialized views referencing expenses_categories
-- ============================================================================
SELECT 
  'MATERIALIZED VIEW' as object_type,
  matviewname as object_name,
  definition as definition
FROM pg_matviews
WHERE schemaname = 'public'
AND definition LIKE '%expenses_categories%'
ORDER BY matviewname;

-- SECTION 4: Summary of what needs to be fixed
-- ============================================================================
SELECT 
  'SUMMARY' as check_type,
  COUNT(*) as count,
  'functions' as object_type
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND pg_get_functiondef(oid) LIKE '%expenses_categories%'
UNION ALL
SELECT 'SUMMARY', COUNT(*), 'views'
FROM information_schema.views
WHERE table_schema = 'public'
AND view_definition LIKE '%expenses_categories%'
UNION ALL
SELECT 'SUMMARY', COUNT(*), 'materialized views'
FROM pg_matviews
WHERE schemaname = 'public'
AND definition LIKE '%expenses_categories%';

