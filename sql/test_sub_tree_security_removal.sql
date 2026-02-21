-- Test script to verify sub_tree access after security layer removal
-- Run this in Supabase SQL Editor to test the changes

-- 1. Test that the new RLS policies are in place
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'sub_tree';

-- 2. Test basic SELECT access (should work for any authenticated user)
-- Note: This will test as the current user running the script
SELECT COUNT(*) as total_sub_tree_records 
FROM public.sub_tree;

-- 3. Test view access
SELECT COUNT(*) as total_sub_tree_full_records 
FROM public.sub_tree_full;

-- 4. Test sub_tree_full_v2 access
SELECT COUNT(*) as total_sub_tree_full_v2_records 
FROM public.sub_tree_full_v2;

-- 5. Test that RPC functions are accessible
-- This should return the function definition if accessible
SELECT 
    proname as function_name,
    pronargs as arg_count,
    prosecdef as security_definer
FROM pg_proc 
WHERE proname LIKE '%sub_tree%' 
    AND proname != 'sub_tree'; -- exclude the table itself

-- 6. Test specific org access (replace with actual org_id from your database)
-- SELECT * FROM public.sub_tree WHERE org_id = 'your-org-id-here' LIMIT 5;

-- 7. Check if org_memberships table exists and has data
-- This helps understand if the original security issue was due to missing memberships
SELECT COUNT(*) as org_membership_count 
FROM public.org_memberships;

-- 8. Test creating a simple sub_tree record (uncomment to test)
-- INSERT INTO public.sub_tree (org_id, code, description, add_to_cost, is_active, level, path)
-- VALUES ('your-org-id-here', 'TEST', 'Test Category', false, true, 1, 'TEST')
-- RETURNING id;

-- After running these tests, you should see:
-- - The new simple policies in pg_policies
-- - Successful SELECT queries returning data
-- - RPC functions listed as accessible
-- - No permission denied errors
