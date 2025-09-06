-- Add permissions for managing permissions
INSERT INTO public.permissions (name, name_ar, resource, action, description)
VALUES 
  ('permissions.view', 'عرض الصلاحيات', 'permissions', 'view', 'View all permissions in the system'),
  ('permissions.create', 'إنشاء صلاحيات', 'permissions', 'create', 'Create new permissions'),
  ('permissions.update', 'تعديل الصلاحيات', 'permissions', 'update', 'Update existing permissions'),
  ('permissions.delete', 'حذف الصلاحيات', 'permissions', 'delete', 'Delete permissions from the system'),
  ('permissions.manage', 'إدارة الصلاحيات', 'permissions', 'manage', 'Full permissions management access')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions management permissions to super admin role
WITH superadmin_role AS (
  SELECT id FROM public.roles 
  WHERE LOWER(name) LIKE '%super%' OR LOWER(name) LIKE '%admin%'
  ORDER BY id
  LIMIT 1
),
perm_permissions AS (
  SELECT id FROM public.permissions WHERE name LIKE 'permissions.%'
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT sar.id, pp.id
FROM superadmin_role sar
CROSS JOIN perm_permissions pp
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Verification: Check permissions were created and assigned
SELECT 
    p.name,
    p.name_ar,
    CASE WHEN rp.role_id IS NOT NULL THEN 'Assigned to SuperAdmin' ELSE 'Not Assigned' END as assignment_status
FROM public.permissions p
LEFT JOIN public.role_permissions rp ON p.id = rp.permission_id
LEFT JOIN public.roles r ON rp.role_id = r.id AND (LOWER(r.name) LIKE '%super%' OR LOWER(r.name) LIKE '%admin%')
WHERE p.name LIKE 'permissions.%'
ORDER BY p.name;
