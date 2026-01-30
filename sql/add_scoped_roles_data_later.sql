-- =====================================================
-- SCOPED ROLES - ADD DATA LATER
-- =====================================================
-- Date: January 26, 2026
-- Purpose: Migrate data from old tables to new scoped roles
-- Run this AFTER Phase 1-4 migrations are complete
-- =====================================================

-- =====================================================
-- 1. ADD SYSTEM-LEVEL ROLES (SUPER ADMINS)
-- =====================================================

INSERT INTO system_roles (user_id, role, created_at, created_by)
SELECT DISTINCT
  up.id as user_id,
  'super_admin' as role,
  NOW() as created_at,
  up.id as created_by
FROM user_profiles up
WHERE up.is_super_admin = true
ON CONFLICT (user_id, role) DO NOTHING;

RAISE NOTICE 'Added % super admin roles', (SELECT COUNT(*) FROM system_roles);

-- =====================================================
-- 2. ADD ORG MEMBERSHIPS AS ORG ROLES
-- =====================================================

INSERT INTO org_roles (
  user_id,
  org_id,
  role,
  can_access_all_projects,
  created_at,
  created_by
)
SELECT DISTINCT
  om.user_id,
  om.org_id,
  'org_viewer' as role,  -- Default role - you can change this
  COALESCE(om.can_access_all_projects, true) as can_access_all_projects,
  COALESCE(om.created_at, NOW()) as created_at,
  om.user_id as created_by
FROM org_memberships om
WHERE NOT EXISTS (
  SELECT 1 FROM system_roles sr
  WHERE sr.user_id = om.user_id
  AND sr.role = 'super_admin'
)
ON CONFLICT (user_id, org_id, role) DO NOTHING;

RAISE NOTICE 'Added % org roles', (SELECT COUNT(*) FROM org_roles);

-- =====================================================
-- 3. ADD PROJECT MEMBERSHIPS AS PROJECT ROLES
-- =====================================================

INSERT INTO project_roles (
  user_id,
  project_id,
  role,
  created_at,
  created_by
)
SELECT DISTINCT
  pm.user_id,
  pm.project_id,
  'project_viewer' as role,  -- Default role - you can change this
  COALESCE(pm.created_at, NOW()) as created_at,
  pm.user_id as created_by
FROM project_memberships pm
WHERE NOT EXISTS (
  SELECT 1 FROM system_roles sr
  WHERE sr.user_id = pm.user_id
  AND sr.role = 'super_admin'
)
ON CONFLICT (user_id, project_id, role) DO NOTHING;

RAISE NOTICE 'Added % project roles', (SELECT COUNT(*) FROM project_roles);

-- =====================================================
-- 4. HANDLE ORG-LEVEL ACCESS TO ALL PROJECTS
-- =====================================================

INSERT INTO project_roles (
  user_id,
  project_id,
  role,
  created_at,
  created_by
)
SELECT DISTINCT
  or1.user_id,
  p.id as project_id,
  'project_viewer' as role,  -- Default role
  NOW() as created_at,
  or1.user_id as created_by
FROM org_roles or1
JOIN projects p ON p.org_id = or1.org_id
WHERE or1.can_access_all_projects = true
AND NOT EXISTS (
  SELECT 1 FROM project_roles pr
  WHERE pr.user_id = or1.user_id
  AND pr.project_id = p.id
)
AND NOT EXISTS (
  SELECT 1 FROM system_roles sr
  WHERE sr.user_id = or1.user_id
  AND sr.role = 'super_admin'
)
ON CONFLICT (user_id, project_id, role) DO NOTHING;

RAISE NOTICE 'Added % project roles for org-level access', 
  (SELECT COUNT(*) FROM project_roles WHERE role = 'project_viewer');

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

DO $$
DECLARE
  system_count INTEGER;
  org_count INTEGER;
  project_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO system_count FROM system_roles;
  SELECT COUNT(*) INTO org_count FROM org_roles;
  SELECT COUNT(*) INTO project_count FROM project_roles;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'SCOPED ROLES - DATA MIGRATION COMPLETE';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'FINAL COUNTS:';
  RAISE NOTICE '  - system_roles: % records', system_count;
  RAISE NOTICE '  - org_roles: % records', org_count;
  RAISE NOTICE '  - project_roles: % records', project_count;
  RAISE NOTICE '==============================================';
END $$;

-- =====================================================
-- SAMPLE QUERIES TO VERIFY DATA
-- =====================================================

-- Check super admins
-- SELECT * FROM system_roles;

-- Check org roles
-- SELECT or1.user_id, or1.org_id, or1.role, o.name 
-- FROM org_roles or1
-- JOIN organizations o ON o.id = or1.org_id
-- LIMIT 10;

-- Check project roles
-- SELECT pr.user_id, pr.project_id, pr.role, p.name
-- FROM project_roles pr
-- JOIN projects p ON p.id = pr.project_id
-- LIMIT 10;

-- Check specific user's roles
-- SELECT 'system' as scope, role FROM system_roles WHERE user_id = 'YOUR_USER_ID'
-- UNION ALL
-- SELECT 'org:' || org_id, role FROM org_roles WHERE user_id = 'YOUR_USER_ID'
-- UNION ALL
-- SELECT 'project:' || project_id, role FROM project_roles WHERE user_id = 'YOUR_USER_ID';
