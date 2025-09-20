-- Fix existing transaction line items permissions by updating missing columns
-- This script updates the existing permissions that were created without resource/action columns

-- Update existing permissions to add the missing resource and action values
UPDATE public.permissions 
SET 
    resource = 'transaction_line_items',
    action = 'view'
WHERE name = 'transaction_line_items.view';

UPDATE public.permissions 
SET 
    resource = 'transaction_line_items',
    action = 'create'
WHERE name = 'transaction_line_items.create';

UPDATE public.permissions 
SET 
    resource = 'transaction_line_items',
    action = 'update'
WHERE name = 'transaction_line_items.update';

UPDATE public.permissions 
SET 
    resource = 'transaction_line_items',
    action = 'delete'
WHERE name = 'transaction_line_items.delete';

-- Verification query to check if permissions were updated correctly
SELECT name, name_ar, description, resource, action
FROM public.permissions 
WHERE name IN ('transaction_line_items.view', 'transaction_line_items.create', 'transaction_line_items.update', 'transaction_line_items.delete')
ORDER BY name;

-- Find the Super Admin role (assuming it has a specific name)
SELECT id, name, name_ar 
FROM public.roles 
WHERE LOWER(name) LIKE '%super%' OR LOWER(name) LIKE '%admin%' OR id = 7;

-- Get permission IDs for the transaction line items permissions and assign to super admin
WITH perm_ids AS (
  SELECT id, name FROM public.permissions 
  WHERE name IN ('transaction_line_items.view', 'transaction_line_items.create', 'transaction_line_items.update', 'transaction_line_items.delete')
),
super_admin_role AS (
  SELECT id FROM public.roles 
  WHERE LOWER(name) LIKE '%super%' OR LOWER(name) LIKE '%admin%' OR id = 7
  LIMIT 1
)
-- Insert role permissions for super admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT sar.id, p.id
FROM super_admin_role sar
CROSS JOIN perm_ids p
ON CONFLICT (role_id, permission_id) DO NOTHING;

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
  p.name_ar AS permission_name_ar,
  p.resource,
  p.action
FROM public.roles r
JOIN public.role_permissions rp ON r.id = rp.role_id
JOIN public.permissions p ON rp.permission_id = p.id
WHERE p.name LIKE 'transaction%'
ORDER BY r.name, p.name;

-- Check specifically for the transaction line items permissions
SELECT 
  r.name AS role_name,
  COUNT(p.id) AS line_items_permissions_count
FROM public.roles r
JOIN public.role_permissions rp ON r.id = rp.role_id
JOIN public.permissions p ON rp.permission_id = p.id
WHERE p.name LIKE 'transaction_line_items%'
GROUP BY r.name, r.id
ORDER BY r.name;