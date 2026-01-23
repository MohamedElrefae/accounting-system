-- =====================================================================
-- TEST SCRIPT: Verify Permissions UI Fix
-- Run this to verify both UI components are working correctly
-- =====================================================================

-- 1. Check how many permissions exist in database
SELECT 
    '1. Total Permissions' as check_step,
    COUNT(*) as total_permissions,
    COUNT(DISTINCT resource) as unique_resources
FROM permissions;

-- 2. List all permissions grouped by resource
SELECT 
    '2. Permissions by Resource' as check_step,
    resource,
    COUNT(*) as permission_count,
    STRING_AGG(name, ', ' ORDER BY name) as permissions
FROM permissions
GROUP BY resource
ORDER BY resource;

-- 3. Check a specific role's permissions (replace 1 with your role ID)
SELECT 
    '3. Role Permissions Check' as check_step,
    r.id as role_id,
    r.name as role_name,
    r.name_ar as role_name_ar,
    COUNT(rp.permission_id) as permissions_assigned,
    STRING_AGG(p.name, ', ' ORDER BY p.name) as permission_list
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.id = 1  -- Change this to your role ID
GROUP BY r.id, r.name, r.name_ar;

-- 4. Check all roles and their permission counts
SELECT 
    '4. All Roles Summary' as check_step,
    r.id,
    r.name,
    r.name_ar,
    r.is_system,
    COUNT(rp.permission_id) as permissions_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name, r.name_ar, r.is_system
ORDER BY r.name;

-- 5. Find permissions that are NOT assigned to any role
SELECT 
    '5. Unassigned Permissions' as check_step,
    p.id,
    p.name,
    p.resource,
    p.action
FROM permissions p
LEFT JOIN role_permissions rp ON p.id = rp.permission_id
WHERE rp.permission_id IS NULL
ORDER BY p.resource, p.action;

-- 6. Find roles with NO permissions assigned
SELECT 
    '6. Roles Without Permissions' as check_step,
    r.id,
    r.name,
    r.name_ar,
    r.is_system
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE rp.role_id IS NULL
ORDER BY r.name;

-- 7. Test the save_role_permissions function
-- This will assign 3 test permissions to the first role
DO $$
DECLARE
    test_role_id INTEGER;
    test_result JSONB;
BEGIN
    -- Get first role ID
    SELECT id INTO test_role_id FROM roles ORDER BY id LIMIT 1;
    
    RAISE NOTICE '=== Testing save_role_permissions function ===';
    RAISE NOTICE 'Test Role ID: %', test_role_id;
    
    -- Call the function
    SELECT save_role_permissions(
        test_role_id,
        ARRAY['users.view', 'users.create', 'roles.view']
    ) INTO test_result;
    
    RAISE NOTICE 'Function Result: %', test_result;
    
    -- Verify the result
    IF (test_result->>'success')::boolean THEN
        RAISE NOTICE '✅ Function executed successfully';
        RAISE NOTICE '✅ Permissions assigned: %', test_result->>'permissions_assigned';
    ELSE
        RAISE NOTICE '❌ Function failed: %', test_result->>'message';
    END IF;
END $$;

-- 8. Verify the test assignment worked
SELECT 
    '8. Verify Test Assignment' as check_step,
    r.name as role_name,
    COUNT(rp.permission_id) as permissions_after_test,
    STRING_AGG(p.name, ', ' ORDER BY p.name) as permission_list
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.id = (SELECT id FROM roles ORDER BY id LIMIT 1)
GROUP BY r.name;

-- 9. Check RLS policies on role_permissions table
SELECT 
    '9. RLS Policies Check' as check_step,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'role_permissions'
ORDER BY policyname;

-- 10. Check if save_role_permissions function exists and is accessible
SELECT 
    '10. Function Check' as check_step,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'save_role_permissions'
AND n.nspname = 'public';

-- =====================================================================
-- CLEANUP: Remove test permissions (optional)
-- Uncomment the following lines if you want to clean up the test
-- =====================================================================

-- DELETE FROM role_permissions 
-- WHERE role_id = (SELECT id FROM roles ORDER BY id LIMIT 1)
-- AND permission_id IN (
--     SELECT id FROM permissions 
--     WHERE name IN ('users.view', 'users.create', 'roles.view')
-- );

-- =====================================================================
-- EXPECTED RESULTS:
-- =====================================================================
-- 1. Should show total number of permissions in database
-- 2. Should show permissions grouped by resource (users, roles, accounts, etc.)
-- 3. Should show permissions for the selected role
-- 4. Should show all roles with their permission counts
-- 5. Should show permissions not assigned to any role (if any)
-- 6. Should show roles without any permissions (if any)
-- 7. Should show success message from function test
-- 8. Should show 3 permissions assigned to test role
-- 9. Should show RLS policies (should have SELECT, INSERT, UPDATE, DELETE policies)
-- 10. Should show the save_role_permissions function exists

-- =====================================================================
-- TROUBLESHOOTING:
-- =====================================================================
-- If step 1 shows 0 permissions:
--   - Run: INSERT INTO permissions (name, resource, action) VALUES ('users.view', 'users', 'view');
--   - Or import permissions from your seed data

-- If step 7 fails:
--   - Check function exists: SELECT * FROM pg_proc WHERE proname = 'save_role_permissions';
--   - Check function definition: \df+ save_role_permissions
--   - Re-run: sql/fix_ambiguous_column_final.sql

-- If step 8 shows 0 permissions after test:
--   - Check RLS policies in step 9
--   - Check user has permission to insert into role_permissions
--   - Check if function actually ran (look at RAISE NOTICE messages)

-- If step 9 shows no policies:
--   - RLS might be disabled or policies missing
--   - Check: SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'role_permissions';
--   - If relrowsecurity is false, RLS is disabled

-- =====================================================================
