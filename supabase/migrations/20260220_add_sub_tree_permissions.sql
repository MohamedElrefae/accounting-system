-- 2026-02-20: Add sub_tree permissions to permissions table
-- This migration adds the missing permissions for sub_tree functionality

-- Insert sub_tree permissions if they don't exist
INSERT INTO public.permissions (name, name_ar, resource, action, description, description_ar, category)
VALUES 
  ('sub_tree.view', 'عرض الشجرة الفرعية', 'sub_tree', 'view', 'View sub tree categories and structure', 'عرض فئات وهيكل الشجرة الفرعية', 'data'),
  ('sub_tree.create', 'إنشاء شجرة فرعية', 'sub_tree', 'create', 'Create new sub tree categories', 'إنشاء فئات شجرة فرعية جديدة', 'data'),
  ('sub_tree.update', 'تحديث الشجرة الفرعية', 'sub_tree', 'update', 'Update existing sub tree categories', 'تحديث فئات الشجرة الفرعية الموجودة', 'data'),
  ('sub_tree.delete', 'حذف الشجرة الفرعية', 'sub_tree', 'delete', 'Delete sub tree categories', 'حذف فئات الشجرة الفرعية', 'data'),
  ('sub_tree.manage', 'إدارة الشجرة الفرعية', 'sub_tree', 'manage', 'Full management access to sub tree (create, update, delete)', 'الوصول الكامل لإدارة الشجرة الفرعية (إنشاء، تحديث، حذف)', 'data')
ON CONFLICT (name) DO NOTHING;

-- Verify permissions were inserted
SELECT 
  name,
  name_ar,
  resource,
  action,
  description,
  category
FROM public.permissions 
WHERE resource = 'sub_tree'
ORDER BY name;
