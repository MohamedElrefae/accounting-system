-- ============================================================================
-- FIND ALL REMAINING REFERENCES TO expenses_categories
-- ============================================================================
-- This searches EVERYWHERE in the database for any reference to expenses_categories

-- SECTION 1: Check table constraints
-- ============================================================================
SELECT 
  'Table Constraints' as check_name,
  constraint_name,
  table_name,
  constraint_definition
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
AND constraint_definition LIKE '%expenses_categories%';

-- SECTION 2: Check column defaults
-- ============================================================================
SELECT 
  'Column Defaults' as check_name,
  table_name,
  column_name,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_default LIKE '%expenses_categories%';

-- SECTION 3: Check all triggers (including their definitions)
-- ============================================================================
SELECT 
  'Triggers' as check_name,
  trigger_name,
  event_object_table,
  action_statement,
  action_orientation,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND (action_statement LIKE '%expenses_categories%' OR trigger_name LIKE '%expenses%');

-- SECTION 4: Check all views (including their definitions)
-- ============================================================================
SELECT 
  'Views' as check_name,
  table_name as view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND (view_definition LIKE '%expenses_categories%' OR table_name LIKE '%expenses%');

-- SECTION 5: Check all functions (including their definitions)
-- ============================================================================
SELECT 
  'Functions' as check_name,
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND (pg_get_functiondef(oid) LIKE '%expenses_categories%' OR proname LIKE '%expenses%');

-- SECTION 6: Check all sequences
-- ============================================================================
SELECT 
  'Sequences' as check_name,
  sequence_name
FROM information_schema.sequences
WHERE sequence_schema = 'public'
AND sequence_name LIKE '%expenses%';

-- SECTION 7: Check all indexes
-- ============================================================================
SELECT 
  'Indexes' as check_name,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND (indexname LIKE '%expenses%' OR indexdef LIKE '%expenses_categories%');

-- SECTION 8: Check all foreign keys
-- ============================================================================
SELECT 
  'Foreign Keys' as check_name,
  constraint_name,
  table_name,
  column_name,
  referenced_table_name,
  referenced_column_name
FROM information_schema.key_column_usage
WHERE table_schema = 'public'
AND (referenced_table_name = 'expenses_categories' OR constraint_name LIKE '%expenses%');

-- SECTION 9: Check all tables
-- ============================================================================
SELECT 
  'Tables' as check_name,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%expenses%';

-- SECTION 10: Check RLS policies
-- ============================================================================
SELECT 
  'RLS Policies' as check_name,
  policyname,
  tablename,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND (tablename LIKE '%expenses%' OR policyname LIKE '%expenses%' OR qual LIKE '%expenses_categories%' OR with_check LIKE '%expenses_categories%');

-- SECTION 11: Check all stored procedures
-- ============================================================================
SELECT 
  'Stored Procedures' as check_name,
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_definition LIKE '%expenses_categories%';

-- SECTION 12: Final summary
-- ============================================================================
SELECT 
  'FINAL CHECK' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses_categories')
    THEN '❌ expenses_categories table still exists'
    ELSE '✅ expenses_categories table removed'
  END as result
UNION ALL
SELECT 'FINAL CHECK',
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE pg_get_functiondef(oid) LIKE '%expenses_categories%' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
    THEN '❌ Functions still reference expenses_categories'
    ELSE '✅ No functions reference expenses_categories'
  END
UNION ALL
SELECT 'FINAL CHECK',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND view_definition LIKE '%expenses_categories%')
    THEN '❌ Views still reference expenses_categories'
    ELSE '✅ No views reference expenses_categories'
  END
UNION ALL
SELECT 'FINAL CHECK',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema = 'public' AND action_statement LIKE '%expenses_categories%')
    THEN '❌ Triggers still reference expenses_categories'
    ELSE '✅ No triggers reference expenses_categories'
  END
UNION ALL
SELECT 'FINAL CHECK',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.key_column_usage WHERE table_schema = 'public' AND referenced_table_name = 'expenses_categories')
    THEN '❌ Foreign keys still reference expenses_categories'
    ELSE '✅ No foreign keys reference expenses_categories'
  END;
