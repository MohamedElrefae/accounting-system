-- ==========================================
-- Quick Debug Check for Enterprise User Management
-- Copy and paste these queries in your SQL editor
-- ==========================================

-- 1. Check if user_profiles table has data
SELECT 
    'user_profiles' as table_name,
    COUNT(*) as record_count,
    'SUCCESS ✓' as status
FROM user_profiles
UNION ALL
-- 2. Check if roles table has data  
SELECT 
    'roles' as table_name,
    COUNT(*) as record_count,
    CASE WHEN COUNT(*) > 0 THEN 'SUCCESS ✓' ELSE 'EMPTY ❌' END as status
FROM roles
UNION ALL
-- 3. Check if permissions table has data
SELECT 
    'permissions' as table_name,
    COUNT(*) as record_count,
    CASE WHEN COUNT(*) > 0 THEN 'SUCCESS ✓' ELSE 'EMPTY ❌' END as status  
FROM permissions
UNION ALL
-- 4. Check if user_roles has assignments
SELECT 
    'user_roles' as table_name,
    COUNT(*) as record_count,
    'INFO' as status
FROM user_roles
UNION ALL
-- 5. Check if role_permissions has assignments
SELECT 
    'role_permissions' as table_name,
    COUNT(*) as record_count,
    'INFO' as status
FROM role_permissions;

-- ==========================================
-- Detailed Check - Users and their data
-- ==========================================

-- Check first 5 users
SELECT 
    id,
    email,
    COALESCE(full_name_ar, first_name || ' ' || last_name, email) as display_name,
    is_active,
    created_at
FROM user_profiles 
ORDER BY email 
LIMIT 5;

-- ==========================================
-- Detailed Check - Roles and their data  
-- ==========================================

-- Check all roles
SELECT 
    id,
    name,
    name_ar,
    is_system,
    created_at
FROM roles 
ORDER BY name;

-- ==========================================
-- Quick Fix - If tables are empty
-- ==========================================

-- If user_profiles is empty, check if you have auth.users
-- SELECT COUNT(*) as auth_users_count FROM auth.users;

-- If roles is empty, create basic roles
/*
INSERT INTO roles (name, name_ar, description, description_ar, is_system) 
VALUES 
    ('superadmin', 'المدير العام', 'System administrator', 'مدير النظام', true),
    ('admin', 'مدير', 'Administrator', 'مدير', false),
    ('user', 'مستخدم', 'Regular user', 'مستخدم عادي', false)
ON CONFLICT (name) DO NOTHING;
*/

-- If permissions is empty, create basic permissions
/*
INSERT INTO permissions (name, resource, action, description) 
VALUES 
    ('users.read', 'users', 'read', 'View users'),
    ('users.create', 'users', 'create', 'Create users'),
    ('users.update', 'users', 'update', 'Update users'),
    ('users.delete', 'users', 'delete', 'Delete users'),
    ('roles.read', 'roles', 'read', 'View roles'),
    ('roles.create', 'roles', 'create', 'Create roles'),
    ('roles.update', 'roles', 'update', 'Update roles'),
    ('roles.delete', 'roles', 'delete', 'Delete roles')
ON CONFLICT (name) DO NOTHING;
*/
