-- Debug: Check if accounts exist and are accessible
-- Test 1: Check if accounts table exists and has data
SELECT 
  COUNT(*) as total_accounts,
  COUNT(*) as active_accounts
FROM public.accounts 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Test 2: Check RLS policies on accounts table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'accounts' AND schemaname = 'public'
ORDER BY policyname;

-- Test 3: Try to query accounts directly (this should show if RLS is working)
SELECT 
  id,
  code,
  name,
  name_ar,
  level,
  is_postable,
  allow_transactions
FROM public.accounts 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
LIMIT 5;

-- Test 4: Check if current user has accountant role
SELECT 
  rolname
FROM pg_roles 
WHERE pg_has_role(
  (SELECT id FROM pg_authid.mappings WHERE rolname = current_user)
);
