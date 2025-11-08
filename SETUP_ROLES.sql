-- Setup standard roles for the accounting system
-- Run this SQL in your Supabase SQL editor

-- Insert standard roles
INSERT INTO public.roles (name, name_ar, description, description_ar, is_system_role) VALUES
('super_admin', 'مدير عام', 'Super Administrator with full system access', 'مدير عام مع صلاحية كاملة للنظام', true),
('admin', 'مدير', 'Administrator with management access', 'مدير مع صلاحيات إدارية', true),
('manager', 'مدير قسم', 'Manager with departmental access', 'مدير قسم مع صلاحيات القسم', true),
('accountant', 'محاسب', 'Accountant with financial access', 'محاسب مع صلاحيات مالية', true),
('auditor', 'مراجع', 'Auditor with review access', 'مراجع مع صلاحيات المراجعة', true),
('viewer', 'مستخدم', 'Basic user with view access', 'مستخدم أساسي مع صلاحيات العرض', true)
ON CONFLICT (name) DO NOTHING;

-- Assign your user as super_admin (replace with your actual user ID)
-- First, get your user ID from auth.users or user_profiles
-- Then run this query with your actual user_id:

-- Example (replace 'your-user-id-here' with actual UUID):
-- INSERT INTO public.user_roles (user_id, role_id, assigned_by, is_active) 
-- SELECT 
--   'your-user-id-here'::uuid,
--   r.id,
--   'your-user-id-here'::uuid,
--   true
-- FROM public.roles r 
-- WHERE r.name = 'super_admin'
-- ON CONFLICT (user_id, role_id) DO NOTHING;

-- To find your user ID, run this query:
SELECT 
  up.id,
  up.email,
  au.email as auth_email
FROM public.user_profiles up
LEFT JOIN auth.users au ON au.id = up.id
ORDER BY up.email;

-- After finding your user ID, assign super_admin role:
-- (Replace the UUID below with your actual user ID)
/*
INSERT INTO public.user_roles (user_id, role_id, assigned_by, is_active) 
SELECT 
  'e84e1ac0-2240-4e37-b747-a01daa44ae4b'::uuid,  -- Replace with your user ID
  r.id,
  'e84e1ac0-2240-4e37-b747-a01daa44ae4b'::uuid,  -- Replace with your user ID
  true
FROM public.roles r 
WHERE r.name = 'super_admin'
ON CONFLICT (user_id, role_id) DO NOTHING;
*/

-- Verify the setup:
SELECT 
  up.email,
  r.name as role_name,
  r.name_ar as role_name_ar,
  ur.is_active
FROM public.user_roles ur
JOIN public.user_profiles up ON up.id = ur.user_id
JOIN public.roles r ON r.id = ur.role_id
WHERE ur.is_active = true
ORDER BY up.email, r.name;