-- Verification queries for Sub Tree deployment
-- Run these after deploying the migration to verify everything is working

-- 1. Verify table exists and has correct structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'sub_tree'
ORDER BY ordinal_position;

-- 2. Verify indexes exist
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'sub_tree'
ORDER BY indexname;

-- 3. Verify views exist
SELECT 
  viewname,
  definition
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('sub_tree_full', 'sub_tree_full_v2')
ORDER BY viewname;

-- 4. Verify RPC functions exist
SELECT 
  proname,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN ('rpc_sub_tree_next_code', 'create_sub_tree', 'update_sub_tree', 'delete_sub_tree')
ORDER BY proname;

-- 5. Verify transaction_lines has sub_tree_id column
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'transaction_lines'
  AND column_name = 'sub_tree_id';

-- 6. Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'sub_tree';

-- 7. Verify RLS policies exist
SELECT 
  policyname,
  tablename,
  permissive,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'sub_tree'
ORDER BY policyname;

-- 8. Test creating a sample node (if you have an org_id)
-- Replace 'YOUR_ORG_ID' with an actual organization UUID
-- SELECT * FROM public.create_sub_tree(
--   'YOUR_ORG_ID'::uuid,
--   '001',
--   'Test Category',
--   false,
--   NULL,
--   NULL
-- );

-- 9. View sample data (if any exists)
SELECT 
  id,
  org_id,
  code,
  description,
  level,
  is_active,
  created_at
FROM public.sub_tree
LIMIT 10;

-- 10. Check view data
SELECT 
  id,
  code,
  description,
  level,
  linked_account_code,
  child_count,
  has_transactions
FROM public.sub_tree_full
LIMIT 10;
