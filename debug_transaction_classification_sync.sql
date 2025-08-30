-- Debug SQL to check transaction classification sync between database and UI
-- Copy and run this in Supabase to identify the synchronization issue

-- 1) Check all transaction classification records
SELECT 'All transaction_classification records' as check_name;
SELECT 
  tc.id,
  tc.code,
  tc.name,
  tc.post_to_costs,
  tc.org_id,
  o.name as org_name,
  o.code as org_code
FROM public.transaction_classification tc
LEFT JOIN public.organizations o ON o.id = tc.org_id
ORDER BY tc.org_id, tc.code;

-- 2) Check organizations
SELECT 'All organizations' as check_name;
SELECT 
  id,
  code,
  name,
  status
FROM public.organizations
ORDER BY code;

-- 3) Check org memberships for current user
SELECT 'Current user org memberships' as check_name;
SELECT 
  om.org_id,
  om.role,
  om.user_id,
  om.created_at,
  o.name as org_name,
  o.code as org_code
FROM public.org_memberships om
LEFT JOIN public.organizations o ON o.id = om.org_id
WHERE om.user_id = auth.uid();

-- 4) Check if current user can see transaction classifications
SELECT 'Records visible to current user' as check_name;
SELECT 
  tc.*,
  o.name as org_name
FROM public.transaction_classification tc
LEFT JOIN public.organizations o ON o.id = tc.org_id
WHERE tc.org_id IN (
  SELECT org_id FROM public.org_memberships 
  WHERE user_id = auth.uid()
)
ORDER BY tc.org_id, tc.code;

-- 5) Test the RPC functions
SELECT 'Test get_next_transaction_classification_code' as check_name;
-- Get the first org_id that the user has access to
DO $$
DECLARE
  user_org_id uuid;
  next_code integer;
BEGIN
  -- Get first org the user belongs to
  SELECT org_id INTO user_org_id
  FROM public.org_memberships 
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF user_org_id IS NOT NULL THEN
    -- Test the function
    SELECT public.get_next_transaction_classification_code(user_org_id) INTO next_code;
    RAISE NOTICE 'Next code for org % would be: %', user_org_id, next_code;
  ELSE
    RAISE NOTICE 'User has no organization memberships';
  END IF;
END $$;

-- 6) Check if RLS is working correctly
SELECT 'RLS Policy Test' as check_name;
-- This should show records if RLS is working
SELECT count(*) as visible_records_count
FROM public.transaction_classification;

-- 7) Check current user ID
SELECT 'Current user info' as check_name;
SELECT 
  auth.uid() as current_user_id,
  current_user as current_user_name;
  
-- 8) Manual insert test (if needed)
-- Uncomment and run this if you need to test manual insertion
/*
SELECT 'Manual insert test' as check_name;
DO $$
DECLARE
  user_org_id uuid;
  result record;
BEGIN
  -- Get first org the user belongs to
  SELECT org_id INTO user_org_id
  FROM public.org_memberships 
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF user_org_id IS NOT NULL THEN
    -- Test insert
    SELECT * INTO result 
    FROM public.transaction_classification_insert(
      user_org_id, 
      99, 
      'Test Classification', 
      true
    );
    RAISE NOTICE 'Test insert successful: %', result.name;
  ELSE
    RAISE NOTICE 'Cannot test insert - user has no organization memberships';
  END IF;
END $$;
*/
