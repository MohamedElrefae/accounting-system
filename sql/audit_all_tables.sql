-- Database Cleanup & Consolidation - Phase 1 Audit
-- Task 1.1: Discover all tables in public schema and document purpose
-- This script identifies all tables, their sizes, and usage patterns

-- 1. List all tables with basic information
SELECT 
  t.table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))) AS table_size,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') AS column_count,
  obj_description((quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass, 'pg_class') AS table_comment
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name)) DESC;

-- 2. Get row counts for all tables
SELECT 
  schemaname,
  tablename,
  n_live_tup AS row_count,
  n_dead_tup AS dead_rows,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- 3. Identify tables by domain/category
-- Transaction-related tables
SELECT 'TRANSACTIONS' AS domain, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name ILIKE '%transaction%'
UNION ALL
-- Permission-related tables
SELECT 'PERMISSIONS' AS domain, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name ILIKE '%role%' OR table_name ILIKE '%permission%')
UNION ALL
-- Organization-related tables
SELECT 'ORGANIZATIONS' AS domain, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name ILIKE '%org%' OR table_name ILIKE '%project%' OR table_name ILIKE '%membership%')
UNION ALL
-- Access control tables
SELECT 'ACCESS_CONTROL' AS domain, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name ILIKE '%access%'
UNION ALL
-- User/Profile tables
SELECT 'USERS' AS domain, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name ILIKE '%user%' OR table_name ILIKE '%profile%' OR table_name ILIKE '%member%')
UNION ALL
-- Report tables
SELECT 'REPORTS' AS domain, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name ILIKE '%report%'
UNION ALL
-- Fiscal tables
SELECT 'FISCAL' AS domain, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name ILIKE '%fiscal%' OR table_name ILIKE '%period%')
UNION ALL
-- Inventory tables
SELECT 'INVENTORY' AS domain, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name ILIKE '%inventory%' OR table_name ILIKE '%material%' OR table_name ILIKE '%location%' OR table_name ILIKE '%uom%')
UNION ALL
-- Audit tables
SELECT 'AUDIT' AS domain, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name ILIKE '%audit%'
UNION ALL
-- Other tables
SELECT 'OTHER' AS domain, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name NOT ILIKE '%transaction%'
  AND table_name NOT ILIKE '%role%'
  AND table_name NOT ILIKE '%permission%'
  AND table_name NOT ILIKE '%org%'
  AND table_name NOT ILIKE '%project%'
  AND table_name NOT ILIKE '%membership%'
  AND table_name NOT ILIKE '%access%'
  AND table_name NOT ILIKE '%user%'
  AND table_name NOT ILIKE '%profile%'
  AND table_name NOT ILIKE '%member%'
  AND table_name NOT ILIKE '%report%'
  AND table_name NOT ILIKE '%fiscal%'
  AND table_name NOT ILIKE '%period%'
  AND table_name NOT ILIKE '%inventory%'
  AND table_name NOT ILIKE '%material%'
  AND table_name NOT ILIKE '%location%'
  AND table_name NOT ILIKE '%uom%'
  AND table_name NOT ILIKE '%audit%'
ORDER BY domain, table_name;

-- 4. Get column information for each table
SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  col_description((quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass, c.ordinal_position) AS column_comment
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- 5. Identify tables with no recent activity (potential legacy tables)
SELECT 
  schemaname,
  tablename,
  n_live_tup AS row_count,
  last_vacuum,
  last_autovacuum,
  CASE 
    WHEN last_autovacuum IS NULL AND last_vacuum IS NULL THEN 'NEVER_VACUUMED'
    WHEN COALESCE(last_autovacuum, last_vacuum) < NOW() - INTERVAL '90 days' THEN 'INACTIVE_90_DAYS'
    WHEN COALESCE(last_autovacuum, last_vacuum) < NOW() - INTERVAL '30 days' THEN 'INACTIVE_30_DAYS'
    ELSE 'ACTIVE'
  END AS activity_status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY COALESCE(last_autovacuum, last_vacuum) ASC NULLS FIRST;

-- 6. Identify tables with no foreign key references (potential candidates for deletion)
SELECT 
  t.table_name,
  (SELECT COUNT(*) FROM information_schema.table_constraints tc 
   WHERE tc.table_name = t.table_name AND tc.constraint_type = 'PRIMARY KEY') AS has_pk,
  (SELECT COUNT(*) FROM information_schema.referential_constraints rc 
   WHERE rc.constraint_name IN (
     SELECT constraint_name FROM information_schema.table_constraints 
     WHERE table_name = t.table_name
   )) AS fk_count_outgoing,
  (SELECT COUNT(*) FROM information_schema.referential_constraints rc 
   WHERE rc.unique_constraint_name IN (
     SELECT constraint_name FROM information_schema.table_constraints 
     WHERE table_name = t.table_name
   )) AS fk_count_incoming
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;

-- 7. List all indexes on tables
SELECT 
  t.tablename,
  i.indexname,
  i.indexdef
FROM pg_indexes i
JOIN pg_tables t ON i.tablename = t.tablename
WHERE i.schemaname = 'public'
ORDER BY t.tablename, i.indexname;

-- 8. List all triggers on tables
SELECT 
  trigger_schema,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 9. List all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 10. Identify potential duplicate tables (same structure)
SELECT 
  t1.table_name AS table1,
  t2.table_name AS table2,
  COUNT(*) AS matching_columns
FROM information_schema.columns c1
JOIN information_schema.columns c2 ON c1.column_name = c2.column_name 
  AND c1.data_type = c2.data_type
JOIN information_schema.tables t1 ON c1.table_name = t1.table_name 
  AND c1.table_schema = t1.table_schema
JOIN information_schema.tables t2 ON c2.table_name = t2.table_name 
  AND c2.table_schema = t2.table_schema
WHERE c1.table_schema = 'public'
  AND c2.table_schema = 'public'
  AND t1.table_type = 'BASE TABLE'
  AND t2.table_type = 'BASE TABLE'
  AND t1.table_name < t2.table_name
GROUP BY t1.table_name, t2.table_name
HAVING COUNT(*) > 3
ORDER BY matching_columns DESC;
