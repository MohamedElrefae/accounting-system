-- Add transaction line items permissions to the database
-- This script adds the missing transaction line items permissions

-- Insert the new permissions
INSERT INTO public.permissions (name, name_ar, description, resource, action)
VALUES 
  ('transaction_line_items.view', 'عرض بنود المعاملات', 'View transaction line items', 'transaction_line_items', 'view')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.permissions (name, name_ar, description, resource, action)
VALUES 
  ('transaction_line_items.create', 'إنشاء بنود المعاملات', 'Create transaction line items', 'transaction_line_items', 'create')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.permissions (name, name_ar, description, resource, action)
VALUES 
  ('transaction_line_items.update', 'تعديل بنود المعاملات', 'Update transaction line items', 'transaction_line_items', 'update')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.permissions (name, name_ar, description, resource, action)
VALUES 
  ('transaction_line_items.delete', 'حذف بنود المعاملات', 'Delete transaction line items', 'transaction_line_items', 'delete')
ON CONFLICT (name) DO NOTHING;

-- Verification query to check if permissions were inserted
SELECT name, name_ar, description 
FROM public.permissions 
WHERE name IN ('transaction_line_items.view', 'transaction_line_items.create', 'transaction_line_items.update', 'transaction_line_items.delete')
ORDER BY name;

-- Find the Super Admin role (assuming it has a specific name)
-- You may need to adjust the role name based on your database
SELECT id, name, name_ar 
FROM public.roles 
WHERE LOWER(name) LIKE '%super%' OR LOWER(name) LIKE '%admin%' OR id = 1;

-- Get permission IDs for the new permissions and assign to super admin
WITH perm_ids AS (
  SELECT id, name FROM public.permissions 
  WHERE name IN ('transaction_line_items.view', 'transaction_line_items.create', 'transaction_line_items.update', 'transaction_line_items.delete')
),
super_admin_role AS (
  SELECT id FROM public.roles 
  WHERE LOWER(name) LIKE '%super%' OR LOWER(name) LIKE '%admin%' OR id = 1
  LIMIT 1
)
-- Insert role permissions for super admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT sar.id, p.id
FROM super_admin_role sar
CROSS JOIN perm_ids p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Final verification: Check what transaction line items permissions the super admin role now has
WITH super_admin_role AS (
  SELECT id, name FROM public.roles 
  WHERE LOWER(name) LIKE '%super%' OR LOWER(name) LIKE '%admin%' OR id = 1
  LIMIT 1
)
SELECT r.name AS role_name, p.name AS permission_name, p.name_ar AS permission_name_ar
FROM super_admin_role r
JOIN public.role_permissions rp ON r.id = rp.role_id
JOIN public.permissions p ON rp.permission_id = p.id
WHERE p.name LIKE 'transaction_line_items%'
ORDER BY p.name;

-- Also assign these permissions to any role that already has transaction permissions
-- This ensures existing roles that can work with transactions can also work with line items
WITH transaction_roles AS (
  SELECT DISTINCT rp.role_id
  FROM public.role_permissions rp
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE p.name LIKE 'transactions%'
),
line_item_perms AS (
  SELECT id FROM public.permissions 
  WHERE name IN ('transaction_line_items.view', 'transaction_line_items.create', 'transaction_line_items.update', 'transaction_line_items.delete')
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT tr.role_id, lip.id
FROM transaction_roles tr
CROSS JOIN line_item_perms lip
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Final comprehensive verification: Show all transaction-related permissions for all roles
SELECT 
  r.name AS role_name,
  r.name_ar AS role_name_ar,
  p.name AS permission_name,
  p.name_ar AS permission_name_ar
FROM public.roles r
JOIN public.role_permissions rp ON r.id = rp.role_id
JOIN public.permissions p ON rp.permission_id = p.id
WHERE p.name LIKE 'transaction%'
ORDER BY r.name, p.name;