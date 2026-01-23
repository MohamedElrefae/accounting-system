-- ============================================================================
-- CHECK MIGRATION HISTORY
-- ============================================================================
-- This query shows which migrations have been applied to your database
-- ============================================================================

-- Show all migrations that have been applied
SELECT 
  name as migration_name,
  executed_at,
  execution_time_ms,
  success
FROM supabase_migrations.schema_migrations
ORDER BY executed_at DESC;

-- Show specifically sub_tree related migrations
SELECT 
  name as migration_name,
  executed_at,
  execution_time_ms,
  success
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%sub_tree%' OR name LIKE '%expenses%'
ORDER BY executed_at DESC;

-- Count total migrations
SELECT 
  COUNT(*) as total_migrations,
  COUNT(CASE WHEN success = true THEN 1 END) as successful_migrations,
  COUNT(CASE WHEN success = false THEN 1 END) as failed_migrations
FROM supabase_migrations.schema_migrations;

-- Show recent migrations (last 20)
SELECT 
  name as migration_name,
  executed_at,
  execution_time_ms,
  success
FROM supabase_migrations.schema_migrations
ORDER BY executed_at DESC
LIMIT 20;

-- ============================================================================
-- INTERPRETATION
-- ============================================================================
-- If you see migrations with name like '20260121_fix_sub_tree_data_sync':
--   ✅ Migration was applied
--   ✅ Check if success = true
--
-- If you DON'T see any sub_tree migrations:
--   ❌ Migration was never applied to Supabase
--   ❌ You only ran it locally
--
-- If success = false:
--   ❌ Migration failed
--   ❌ Check Supabase logs for error details
-- ============================================================================
