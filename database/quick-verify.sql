-- Quick Verification for Existing Enterprise Role Management Setup
-- Copy and paste this in your SQL editor

-- 1. Verify core tables exist and have data
SELECT 'ROLES' as table_name, COUNT(*) as count FROM roles
UNION ALL
SELECT 'PERMISSIONS', COUNT(*) FROM permissions  
UNION ALL
SELECT 'ROLE_PERMISSIONS', COUNT(*) FROM role_permissions
UNION ALL
SELECT 'USER_ROLES', COUNT(*) FROM user_roles;

-- 2. Check roles with permission counts
SELECT 
    r.id,
    r.name_ar as "اسم الدور",
    r.name as "Role Name",
    r.is_system as "نظامي",
    COUNT(rp.permission_id) as "عدد الصلاحيات"
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name_ar, r.name, r.is_system
ORDER BY "عدد الصلاحيات" DESC;

-- 3. Test save_role_permissions function exists
SELECT 
    routine_name as "Function Name",
    'EXISTS ✓' as "Status"
FROM information_schema.routines 
WHERE routine_name = 'save_role_permissions' 
AND routine_schema = 'public';

-- 4. Check RLS policies are active
SELECT 
    tablename as "Table",
    CASE WHEN rowsecurity THEN 'ENABLED ✓' ELSE 'DISABLED ❌' END as "RLS Status"
FROM pg_tables 
WHERE tablename IN ('roles', 'permissions', 'role_permissions', 'user_roles')
AND schemaname = 'public'
ORDER BY tablename;
