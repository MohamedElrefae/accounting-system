-- ==========================================
-- Verification Script for Enterprise Role Management
-- ==========================================

-- 1. Check if all tables exist
SELECT 
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('roles', 'permissions', 'role_permissions', 'user_roles')
ORDER BY table_name;

-- 2. Check roles data
SELECT 
    id,
    name,
    name_ar,
    is_system,
    created_at
FROM roles 
ORDER BY id;

-- 3. Check permissions count
SELECT 
    COUNT(*) as total_permissions,
    COUNT(DISTINCT resource) as unique_resources,
    COUNT(DISTINCT action) as unique_actions
FROM permissions;

-- 4. Check role-permission assignments
SELECT 
    r.name_ar as role_name,
    COUNT(rp.permission_id) as assigned_permissions
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name_ar
ORDER BY assigned_permissions DESC;

-- 5. Check functions exist
SELECT 
    routine_name,
    routine_type,
    'EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('save_role_permissions', 'is_super_admin');

-- 6. Check RLS is enabled
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED' 
        ELSE 'RLS DISABLED' 
    END as security_status
FROM pg_tables 
WHERE tablename IN ('roles', 'permissions', 'role_permissions', 'user_roles')
AND schemaname = 'public';

-- 7. Test save_role_permissions function (example)
-- Note: Run this only if you have a role with id=1
/*
SELECT save_role_permissions(1, ARRAY['users.read', 'users.create']);
*/

-- 8. Sample query to check role hierarchy
WITH role_hierarchy AS (
    SELECT 
        r.id,
        r.name,
        r.name_ar,
        r.is_system,
        ARRAY_AGG(p.name ORDER BY p.name) as permissions
    FROM roles r
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    LEFT JOIN permissions p ON rp.permission_id = p.id
    GROUP BY r.id, r.name, r.name_ar, r.is_system
)
SELECT 
    name_ar,
    is_system,
    COALESCE(array_length(permissions, 1), 0) as permission_count,
    CASE 
        WHEN array_length(permissions, 1) > 20 THEN 'HIGH'
        WHEN array_length(permissions, 1) > 10 THEN 'MEDIUM'
        WHEN array_length(permissions, 1) > 0 THEN 'LOW'
        ELSE 'NONE'
    END as permission_level
FROM role_hierarchy
ORDER BY permission_count DESC;

-- 9. Check if superadmin user exists and has proper role assignment
SELECT 
    u.email,
    r.name_ar as role_name,
    ur.assigned_at
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.name IN ('superadmin', 'admin', 'super_admin')
ORDER BY ur.assigned_at DESC;

-- 10. Performance check - count all records
SELECT 
    'roles' as table_name, COUNT(*) as record_count FROM roles
UNION ALL
SELECT 
    'permissions' as table_name, COUNT(*) as record_count FROM permissions
UNION ALL
SELECT 
    'role_permissions' as table_name, COUNT(*) as record_count FROM role_permissions
UNION ALL
SELECT 
    'user_roles' as table_name, COUNT(*) as record_count FROM user_roles;
