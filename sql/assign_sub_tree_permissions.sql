-- Helper script to assign sub_tree permissions to users/roles
-- Run this after adding permissions to grant access to existing users

-- Option 1: Grant sub_tree permissions to all existing super admins
INSERT INTO public.user_permissions (user_id, permission_id)
SELECT DISTINCT up.user_id, p.id
FROM public.user_permissions up
CROSS JOIN public.permissions p
WHERE p.resource = 'sub_tree'
AND up.permission_id IN (
    SELECT p2.id FROM public.permissions p2 
    WHERE p2.name IN ('super_admin', 'admin', 'system_admin')
)
ON CONFLICT (user_id, permission_id) DO NOTHING;

-- Option 2: Grant sub_tree permissions to users with org admin roles
INSERT INTO public.user_permissions (user_id, permission_id)
SELECT DISTINCT ur.user_id, p.id
FROM public.user_roles ur
CROSS JOIN public.permissions p
WHERE p.resource = 'sub_tree'
AND ur.role_id IN (
    SELECT r.id FROM public.roles r 
    WHERE r.name IN ('org_admin', 'organization_admin', 'admin')
)
ON CONFLICT (user_id, permission_id) DO NOTHING;

-- Option 3: Grant sub_tree.manage permission to users who already have similar permissions
INSERT INTO public.user_permissions (user_id, permission_id)
SELECT DISTINCT up.user_id, p.id
FROM public.user_permissions up
CROSS JOIN public.permissions p
WHERE p.resource = 'sub_tree' AND p.action = 'manage'
AND up.permission_id IN (
    SELECT p2.id FROM public.permissions p2 
    WHERE p2.resource IN ('accounts', 'projects', 'transactions') 
    AND p2.action IN ('manage', 'admin', 'full_access')
)
ON CONFLICT (user_id, permission_id) DO NOTHING;

-- Check current permission assignments
SELECT 
  u.email,
  p.name as permission_name,
  p.resource,
  p.action,
  up.created_at as granted_at
FROM public.user_permissions up
JOIN public.permissions p ON up.permission_id = p.id
JOIN auth.users u ON up.user_id = u.id
WHERE p.resource = 'sub_tree'
ORDER BY u.email, p.name;
