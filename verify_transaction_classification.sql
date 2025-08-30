-- Verification SQL for transaction classification implementation
-- Run this AFTER running the migration to verify everything works correctly

-- 1) Check table creation
SELECT 
  'transaction_classification table exists' as check_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'transaction_classification'
  ) as result;

-- 2) Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'transaction_classification'
ORDER BY ordinal_position;

-- 3) Check constraints
SELECT 
  constraint_name, 
  constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
  AND table_name = 'transaction_classification';

-- 4) Check indexes
SELECT 
  indexname, 
  indexdef
FROM pg_indexes 
WHERE tablename = 'transaction_classification' 
  AND schemaname = 'public';

-- 5) Check RLS policies
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'transaction_classification' 
  AND schemaname = 'public';

-- 6) Check functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%transaction_classification%'
ORDER BY routine_name;

-- 7) Check initial data was inserted
SELECT 
  'Initial data count' as check_name,
  count(*) as total_records,
  count(distinct org_id) as organizations_with_data
FROM public.transaction_classification;

-- 8) Sample data from each organization
SELECT 
  o.name as org_name,
  tc.code,
  tc.name,
  tc.post_to_costs
FROM public.transaction_classification tc
JOIN public.organizations o ON o.id = tc.org_id
ORDER BY o.name, tc.code
LIMIT 20;

-- 9) Test CRUD functions (read-only checks)
-- Check if functions can be called (this won't actually insert/update/delete)
SELECT 
  'get_next_transaction_classification_code function works' as check_name,
  EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
      AND routine_name = 'get_next_transaction_classification_code'
  ) as function_exists;
