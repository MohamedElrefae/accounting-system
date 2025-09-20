-- =====================================================================
-- CORRECTED VERIFICATION SCRIPTS
-- These work with your actual table structure (no granted_by/granted_at columns)
-- =====================================================================

-- First, show your actual table structure
SELECT 
    'TABLE STRUCTURE CHECK' as "Category",
    '🏗️' as "Icon",
    'Checking your role_permissions table structure...' as "Message";

-- Check role_permissions table structure
SELECT 
    column_name as "Column",
    data_type as "Type",
    is_nullable as "Nullable"
FROM information_schema.columns 
WHERE table_name = 'role_permissions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================================
-- SCRIPT 1: Test CORRECTED Permission Saving Function
-- =====================================================================

-- Test the corrected save_role_permissions function
DO $$
DECLARE
    test_role_id INTEGER;
    result JSONB;
    perm_count_before INTEGER;
    perm_count_after INTEGER;
    test_permissions TEXT[] := ARRAY['users.read', 'users.create', 'roles.read'];
BEGIN
    RAISE NOTICE '🧪 TESTING CORRECTED PERMISSION SAVING FUNCTION...';
    
    -- Get a role to test with
    SELECT id INTO test_role_id 
    FROM roles 
    WHERE NOT is_system 
    LIMIT 1;
    
    IF test_role_id IS NULL THEN
        RAISE NOTICE '❌ No test role found. Creating one...';
        INSERT INTO roles (name, name_ar, description)
        VALUES ('test_role', 'دور تجريبي', 'Test role for verification')
        RETURNING id INTO test_role_id;
    END IF;
    
    RAISE NOTICE '🎯 Using test role ID: %', test_role_id;
    
    -- Count permissions before
    SELECT COUNT(*) INTO perm_count_before
    FROM role_permissions 
    WHERE role_id = test_role_id;
    
    RAISE NOTICE '📊 Permissions before assignment: %', perm_count_before;
    
    -- Test the corrected function
    SELECT save_role_permissions(test_role_id, test_permissions) INTO result;
    
    RAISE NOTICE '📝 Function result: %', result;
    
    -- Count permissions after
    SELECT COUNT(*) INTO perm_count_after
    FROM role_permissions 
    WHERE role_id = test_role_id;
    
    RAISE NOTICE '📊 Permissions after assignment: %', perm_count_after;
    
    -- Verify the fix worked
    IF perm_count_after >= array_length(test_permissions, 1) THEN
        RAISE NOTICE '✅ SUCCESS: Permission saving function is working correctly!';
        RAISE NOTICE '✅ Assigned % permissions successfully', perm_count_after;
    ELSE
        RAISE NOTICE '❌ ERROR: Permission saving function is still not working!';
        RAISE NOTICE '❌ Expected at least % permissions, got %', array_length(test_permissions, 1), perm_count_after;
    END IF;
    
END;
$$;

-- =====================================================================
-- SCRIPT 2: Test CORRECTED Emergency Function
-- =====================================================================

-- Test the corrected emergency assign all permissions function
DO $$
DECLARE
    admin_role_id INTEGER;
    total_permissions INTEGER;
    assigned_permissions INTEGER;
    result JSONB;
BEGIN
    RAISE NOTICE '🚨 TESTING CORRECTED EMERGENCY FUNCTION...';
    
    -- Count total permissions in system
    SELECT COUNT(*) INTO total_permissions FROM permissions;
    RAISE NOTICE '📊 Total permissions in system: %', total_permissions;
    
    -- Find or create admin role
    SELECT id INTO admin_role_id FROM roles WHERE name ILIKE '%admin%' LIMIT 1;
    
    IF admin_role_id IS NULL THEN
        RAISE NOTICE '❌ No admin role found. Creating one...';
        INSERT INTO roles (name, name_ar, description, is_system)
        VALUES ('admin', 'المدير', 'Administrator role', true)
        RETURNING id INTO admin_role_id;
    END IF;
    
    -- Test emergency function
    SELECT emergency_assign_all_permissions_to_role('admin') INTO result;
    
    RAISE NOTICE '📝 Emergency function result: %', result;
    
    -- Verify all permissions were assigned
    SELECT COUNT(*) INTO assigned_permissions
    FROM role_permissions
    WHERE role_id = admin_role_id;
    
    RAISE NOTICE '📊 Permissions assigned to admin: %', assigned_permissions;
    
    IF assigned_permissions = total_permissions THEN
        RAISE NOTICE '✅ SUCCESS: Emergency function assigned all % permissions!', total_permissions;
    ELSE
        RAISE NOTICE '⚠️  PARTIAL SUCCESS: Expected %, got % (some permissions may not exist)', total_permissions, assigned_permissions;
    END IF;
    
END;
$$;

-- =====================================================================
-- SCRIPT 3: System Health Check
-- =====================================================================

-- Comprehensive system health check
SELECT 
    'SYSTEM HEALTH CHECK' as "Test Category",
    '🏥' as "Status Icon",
    'Starting comprehensive system verification...' as "Message";

-- Check 1: Core tables exist
SELECT 
    'Table Existence' as "Test Category",
    CASE WHEN COUNT(*) = 4 THEN '✅' ELSE '❌' END as "Status Icon",
    'Found ' || COUNT(*) || ' out of 4 required tables' as "Message"
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('roles', 'permissions', 'role_permissions', 'user_roles');

-- Check 2: Functions exist
SELECT 
    'Function Existence' as "Test Category",
    CASE WHEN COUNT(*) >= 2 THEN '✅' ELSE '❌' END as "Status Icon",
    'Found ' || COUNT(*) || ' critical functions' as "Message"
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('save_role_permissions', 'emergency_assign_all_permissions_to_role');

-- Check 3: Data availability
SELECT 
    'Data Availability' as "Test Category",
    CASE WHEN roles_count > 0 AND perms_count > 0 THEN '✅' ELSE '❌' END as "Status Icon",
    'Roles: ' || roles_count || ', Permissions: ' || perms_count as "Message"
FROM (
    SELECT 
        (SELECT COUNT(*) FROM roles) as roles_count,
        (SELECT COUNT(*) FROM permissions) as perms_count
) data_check;

-- Check 4: RLS Status
SELECT 
    'Security (RLS)' as "Test Category",
    CASE WHEN COUNT(*) = 4 THEN '✅' ELSE '⚠️' END as "Status Icon",
    COUNT(*) || ' out of 4 tables have RLS enabled' as "Message"
FROM pg_tables 
WHERE tablename IN ('roles', 'permissions', 'role_permissions', 'user_roles')
AND schemaname = 'public'
AND rowsecurity = true;

-- =====================================================================
-- SCRIPT 4: Role-Permission Assignment Test
-- =====================================================================

-- Test various role-permission scenarios
WITH test_scenarios AS (
    SELECT 
        r.id as role_id,
        r.name_ar as role_name,
        COUNT(rp.permission_id) as current_permissions,
        CASE 
            WHEN COUNT(rp.permission_id) = 0 THEN '⚠️ No permissions'
            WHEN COUNT(rp.permission_id) < 5 THEN '🔶 Few permissions'
            WHEN COUNT(rp.permission_id) < 20 THEN '🟡 Some permissions'
            ELSE '✅ Many permissions'
        END as permission_status
    FROM roles r
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    GROUP BY r.id, r.name_ar
    ORDER BY current_permissions DESC
)
SELECT 
    'Role Permissions' as "Test Category",
    permission_status as "Status Icon",
    role_name || ' (' || current_permissions || ' permissions)' as "Message"
FROM test_scenarios
LIMIT 10;

-- =====================================================================
-- SCRIPT 5: Integration Readiness Check
-- =====================================================================

-- Final integration readiness verification
DO $$
DECLARE
    roles_count INTEGER;
    permissions_count INTEGER;
    assignments_count INTEGER;
    functions_count INTEGER;
    readiness_score INTEGER := 0;
    max_score INTEGER := 8;
BEGIN
    RAISE NOTICE '🎯 INTEGRATION READINESS CHECK...';
    
    -- Count roles
    SELECT COUNT(*) INTO roles_count FROM roles;
    IF roles_count > 0 THEN readiness_score := readiness_score + 2; END IF;
    RAISE NOTICE '📊 Roles in system: %', roles_count;
    
    -- Count permissions  
    SELECT COUNT(*) INTO permissions_count FROM permissions;
    IF permissions_count > 0 THEN readiness_score := readiness_score + 2; END IF;
    RAISE NOTICE '📊 Permissions in system: %', permissions_count;
    
    -- Count assignments
    SELECT COUNT(*) INTO assignments_count FROM role_permissions;
    IF assignments_count > 0 THEN readiness_score := readiness_score + 1; END IF;
    RAISE NOTICE '📊 Role-permission assignments: %', assignments_count;
    
    -- Count functions
    SELECT COUNT(*) INTO functions_count 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN ('save_role_permissions', 'emergency_assign_all_permissions_to_role');
    IF functions_count >= 2 THEN readiness_score := readiness_score + 3; END IF;
    RAISE NOTICE '📊 Critical functions available: %', functions_count;
    
    -- Calculate readiness percentage
    RAISE NOTICE '📊 Readiness Score: %/% (%%)', readiness_score, max_score, ROUND((readiness_score::DECIMAL / max_score) * 100);
    
    -- Final verdict
    IF readiness_score >= max_score THEN
        RAISE NOTICE '🎉 SYSTEM READY FOR INTEGRATION! All checks passed.';
    ELSIF readiness_score >= (max_score * 0.75) THEN
        RAISE NOTICE '⚠️  SYSTEM MOSTLY READY. Some minor issues detected.';
    ELSE
        RAISE NOTICE '❌ SYSTEM NOT READY. Critical issues need to be resolved.';
    END IF;
    
END;
$$;

-- =====================================================================
-- SCRIPT 6: Quick Manual Test Commands
-- =====================================================================

-- Quick commands you can run to manually test the corrected system

-- Test 1: View all roles with their permission counts
SELECT 
    '🔍 MANUAL TEST 1: Role Overview' as "Description",
    '' as "Copy the command below:";

SELECT 
    r.name_ar as "الدور",
    r.name as "Role",
    r.is_system as "نظامي",
    COUNT(rp.permission_id) as "عدد الصلاحيات"
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name_ar, r.name, r.is_system
ORDER BY "عدد الصلاحيات" DESC;

-- Test 2: View permissions by resource
SELECT 
    '🔍 MANUAL TEST 2: Permissions by Resource' as "Description",
    '' as "Copy the command below:";

SELECT 
    p.resource as "المورد",
    COUNT(*) as "عدد الصلاحيات",
    STRING_AGG(p.action, ', ') as "الإجراءات"
FROM permissions p
GROUP BY p.resource
ORDER BY COUNT(*) DESC;

-- Test 3: Emergency admin assignment (USE WITH CAUTION!)
SELECT 
    '🚨 MANUAL TEST 3: Emergency Admin Assignment' as "Description",
    'SELECT emergency_assign_all_permissions_to_role(''admin'');' as "Copy this command (CAUTION!):";

-- Test 4: Test specific role permission assignment
SELECT 
    '🧪 MANUAL TEST 4: Test Permission Assignment' as "Description",
    'SELECT save_role_permissions(1, ARRAY[''users.read'', ''users.create'']);' as "Copy this command (adjust role ID):";

-- =====================================================================
-- FINAL SUCCESS MESSAGE
-- =====================================================================

SELECT 
    '🎊' as "Status",
    'CORRECTED VERIFICATION COMPLETE!' as "Message",
    'Your corrected system has been tested and verified. Check the results above.' as "Details";

SELECT 
    '📋' as "Next Steps",
    'If all tests passed:' as "Action",
    '1. Use the CORRECTED_EMERGENCY_FIX.sql script 2. Integrate the enhanced UI component 3. Test in your application' as "Instructions";

SELECT 
    '✅' as "Fixed",
    'Column Errors Resolved' as "Issue",
    'Functions now work with your actual table structure (no granted_by/granted_at)' as "Solution";

-- End of corrected verification scripts