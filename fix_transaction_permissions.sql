-- Fix transaction permissions for submenu visibility
-- This script will add the missing transaction permissions to the database

-- First, check if these permissions already exist and insert if missing
INSERT INTO public.permissions (name, name_ar, description)
VALUES 
  ('transactions.read.own', 'عرض معاملاتي', 'View own transactions')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.permissions (name, name_ar, description)
VALUES 
  ('transactions.read.all', 'عرض جميع المعاملات', 'View all transactions in system')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.permissions (name, name_ar, description)
VALUES 
  ('transactions.post', 'ترحيل المعاملات', 'Post and approve transactions')
ON CONFLICT (name) DO NOTHING;

-- Verification query to check if permissions were inserted
SELECT name, name_ar, description 
FROM public.permissions 
WHERE name IN ('transactions.read.own', 'transactions.read.all', 'transactions.post');

-- Find the Super Admin role (assuming it has a specific name)
-- You may need to adjust the role name based on your database
SELECT id, name, name_ar 
FROM public.roles 
WHERE LOWER(name) LIKE '%super%' OR LOWER(name) LIKE '%admin%' OR id = 1;

-- Get permission IDs for the new permissions
WITH perm_ids AS (
  SELECT id, name FROM public.permissions 
  WHERE name IN ('transactions.read.own', 'transactions.read.all', 'transactions.post')
),
super_admin_role AS (
  SELECT id FROM public.roles 
  WHERE LOWER(name) LIKE '%super%' OR LOWER(name) LIKE '%admin%' OR id = 1
  LIMIT 1
)
-- Insert role permissions for super admin (replace role_id = 1 with actual super admin role ID)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT sar.id, p.id
FROM super_admin_role sar
CROSS JOIN perm_ids p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Final verification: Check what permissions the super admin role now has
WITH super_admin_role AS (
  SELECT id, name FROM public.roles 
  WHERE LOWER(name) LIKE '%super%' OR LOWER(name) LIKE '%admin%' OR id = 1
  LIMIT 1
)
SELECT r.name AS role_name, p.name AS permission_name, p.name_ar AS permission_name_ar
FROM super_admin_role r
JOIN public.role_permissions rp ON r.id = rp.role_id
JOIN public.permissions p ON rp.permission_id = p.id
WHERE p.name LIKE 'transactions%'
ORDER BY p.name;
