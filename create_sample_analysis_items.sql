-- Create Sample Analysis Work Items
-- Run this after fixing your organization membership

-- First, let's see if any analysis work items exist
SELECT COUNT(*) as existing_analysis_items FROM analysis_work_items;

-- Create some sample analysis work items for your organization
-- Replace with your actual org_id if you want to be more specific
INSERT INTO analysis_work_items (org_id, code, name, name_ar, description, is_active)
VALUES 
  (
    (SELECT id FROM organizations LIMIT 1),
    'PROJ001',
    'Project Alpha Development',
    'تطوير مشروع ألفا',
    'Development work for Project Alpha',
    true
  ),
  (
    (SELECT id FROM organizations LIMIT 1),
    'PROJ002', 
    'Marketing Campaign Q1',
    'حملة التسويق ربع 1',
    'Q1 marketing campaign activities',
    true
  ),
  (
    (SELECT id FROM organizations LIMIT 1),
    'MAINT001',
    'System Maintenance',
    'صيانة النظام',
    'Regular system maintenance tasks',
    true
  ),
  (
    (SELECT id FROM organizations LIMIT 1),
    'TRAIN001',
    'Staff Training Program',
    'برنامج تدريب الموظفين',
    'Employee training and development',
    true
  ),
  (
    (SELECT id FROM organizations LIMIT 1),
    'ADMIN001',
    'Administrative Tasks',
    'المهام الإدارية',
    'General administrative work',
    true
  )
ON CONFLICT (org_id, code) DO NOTHING;

-- Verify the analysis work items were created
SELECT 
  id,
  code,
  name,
  name_ar,
  is_active,
  created_at
FROM analysis_work_items
WHERE org_id = (SELECT id FROM organizations LIMIT 1)
ORDER BY code;