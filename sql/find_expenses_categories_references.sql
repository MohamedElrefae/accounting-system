-- ============================================================================
-- FIND ALL REFERENCES TO expenses_categories IN DATABASE
-- ============================================================================

-- SECTION 1: Check if expenses_categories table still exists
-- ============================================================================
SELECT 
  'Table Existence Check' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses_categories')
    THEN 'expenses_categories table EXISTS'
    ELSE 'expenses_categories table DOES NOT EXIST'
  END as result;

-- SECTION 2: Check if sub_tree table exists
-- ============================================================================
SELECT 
  'Table Existence Check' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_tree')
    THEN 'sub_tree table EXISTS'
    ELSE 'sub_tree table DOES NOT EXIST'
  END as result;

-- SECTION 3: Find all functions that reference expenses_categories
-- ============================================================================
SELECT 
  'Functions Referencing expenses_categories' as check_name,
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND pg_get_functiondef(oid) LIKE '%expenses_categories%';

-- SECTION 4: Find all views that reference expenses_categories
-- ============================================================================
SELECT 
  'Views Referencing expenses_categories' as check_name,
  table_name as view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND view_definition LIKE '%expenses_categories%';

-- SECTION 5: Find all triggers that reference expenses_categories
-- ============================================================================
SELECT 
  'Triggers Referencing expenses_categories' as check_name,
  trigger_name,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND action_statement LIKE '%expenses_categories%';

-- SECTION 6: Check constraints that reference expenses_categories
-- ============================================================================
SELECT 
  'Constraints Referencing expenses_categories' as check_name,
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND constraint_name LIKE '%expenses_categories%';

-- SECTION 7: Check foreign keys that reference expenses_categories
-- ============================================================================
SELECT 
  'Foreign Keys Referencing expenses_categories' as check_name,
  constraint_name,
  table_name,
  column_name,
  referenced_table_name,
  referenced_column_name
FROM information_schema.key_column_usage
WHERE table_schema = 'public'
AND referenced_table_name = 'expenses_categories';

-- SECTION 8: Check if there are any columns with expenses_category in the name
-- ============================================================================
SELECT 
  'Columns with expenses_category in name' as check_name,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name LIKE '%expenses_category%';

-- SECTION 9: Check transaction_lines table for sub_tree_id column
-- ============================================================================
SELECT 
  'transaction_lines columns' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'transaction_lines'
ORDER BY ordinal_position;

-- SECTION 10: Check if there's a foreign key from transaction_lines to sub_tree
-- ============================================================================
SELECT 
  'Foreign Keys from transaction_lines' as check_name,
  constraint_name,
  column_name,
  referenced_table_name,
  referenced_column_name
FROM information_schema.key_column_usage
WHERE table_schema = 'public'
AND table_name = 'transaction_lines'
AND referenced_table_name IS NOT NULL;

-- SECTION 11: List all tables in public schema
-- ============================================================================
SELECT 
  'All Tables in public schema' as check_name,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- SECTION 12: Check the sub_tree_biu_set_path_level function
-- ============================================================================
SELECT 
  'sub_tree_biu_set_path_level function' as check_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'sub_tree_biu_set_path_level'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================================================
-- INTERPRETATION
-- ============================================================================
-- If you see "expenses_categories table EXISTS":
--   ❌ Old table still exists, may be causing conflicts
--
-- If you see functions/views/triggers referencing expenses_categories:
--   ❌ These need to be updated to reference sub_tree instead
--
-- If you see foreign keys to expenses_categories:
--   ❌ These need to be updated to reference sub_tree instead
--
-- If you see columns with expenses_category in the name:
--   ❌ These may need to be renamed to sub_tree_id
-- ============================================================================
