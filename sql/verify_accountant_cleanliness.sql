-- 🔍 DB VERIFICATION SCRIPT
-- Execute this to see exactly what the database thinks.

-- 1. Check 'accountant' role permissions
SELECT 
  r.name as role_name, 
  p.name as permission_name 
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.name = 'accountant';

-- 2. Check YOUR user's roles (Replace 'YOUR_EMAIL' below if you want specific check, or just run)
-- This lists ALL users with 'accountant' role
SELECT 
  u.email,
  r.name as role_name,
  ur.is_active
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
JOIN auth.users u ON u.id = ur.user_id
WHERE r.name = 'accountant';

-- 3. Check for Direct Permissions
-- (Any user having reports.view directly?)
SELECT 
  u.email,
  p.name as permission
FROM user_permissions up
JOIN permissions p ON p.id = up.permission_id
JOIN auth.users u ON u.id = up.user_id
WHERE p.name = 'reports.view';
