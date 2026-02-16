-- Complete Schema Scan for bgxknceshxxifwytalex Supabase Project
-- This script discovers all tables, columns, and their current state

-- 1. List all tables in public schema
SELECT 
  table_name,
  table_type,
  table_schema
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Check if transactions table exists and its structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'transactions'
ORDER BY ordinal_position;

-- 3. Check if transaction_lines table exists and its structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'transaction_lines'
ORDER BY ordinal_position;

-- 4. Check for any transaction-related tables
SELECT 
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%transaction%' OR table_name LIKE '%trans%')
ORDER BY table_name;

-- 5. List all indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 6. Check RLS policies
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

-- 7. List all functions/procedures
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 8. Check table row counts
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
