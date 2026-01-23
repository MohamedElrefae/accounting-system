-- =====================================================================
-- DIAGNOSTIC SCRIPT: Permission Sync Issues
-- Run this to identify why permissions aren't saving
-- =====================================================================

-- 1. Check if save_role_permissions function exists
SELECT 
    '1. Function Check' as step,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Function exists'
        ELSE '❌ Function missing - run fix SQL'
    END as status
FROM pg_proc 
WHERE proname = 'save_role_permissions';

-- 2. Check role_permissions table structure
SELECT 
    '2. Table Structure' as step,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'role_permissions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if there are any role_permissions
SELECT 
    '3. Data Check' as step,
    COUNT(*) as total_role_permissions,
    COUNT(DISTINCT role_id) as roles_with_permissions
FROM role_permissions;

-- 4. Check RLS policies
SELECT 
    '4. RLS Policies' as step,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'role_permissions';

-- 5. Test the function with a sample role
DO $$
DECLARE
    test_role_id INTEGER;
    result JSONB;
    perm_count_before INTEGER;
    perm_count_after INTEGER;
BEGIN
    RAISE NOTICE '5. Function Test';
    
    SELECT id INTO test_role_id FROM roles LIMIT 1;
    
    IF test_role_id IS NULL THEN
        RAISE NOTICE '❌ No roles found in system';
        RETURN;
    END IF;
    
    SELECT COUNT(*) INTO perm_count_before
    FROM role_permissions WHERE role_id = test_role_id;
    
    RAISE NOTICE 'Testing with role ID: %', test_role_id;
    RAISE NOTICE 'Permissions before: %', perm_count_before;
    
    SELECT save_role_permissions(test_role_id, ARRAY['users.read']) INTO result;
    
    RAISE NOTICE 'Function result: %', result;
    
    SELECT COUNT(*) INTO perm_count_after
    FROM role_permissions WHERE role_id = test_role_id;
    
    RAISE NOTICE 'Permissions after: %', perm_count_after;
    
    IF perm_count_after > perm_count_before THEN
        RAISE NOTICE '✅ Function works - permissions were saved';
    ELSE
        RAISE NOTICE '❌ Function failed - permissions not saved';
    END IF;
END;
$$;
