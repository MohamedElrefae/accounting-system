-- =====================================================
-- SCOPED ROLES MIGRATION - PHASE 2: MIGRATE DATA (FIXED)
-- =====================================================
-- Date: January 26, 2026
-- Purpose: Migrate existing data from old tables to new scoped roles
-- This version handles the actual schema structure
-- =====================================================

-- =====================================================
-- 1. MIGRATE SYSTEM-LEVEL ROLES (SUPER ADMINS)
-- =====================================================
-- Identify super admins from user_profiles
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

-- =====================================================
-- 2. MIGRATE ORG MEMBERSHIPS TO ORG ROLES
-- =====================================================
-- Convert org_memberships to org_roles
-- Use user_profiles.role as the default role
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
  CASE 
    -- Map user profile role to org-scoped roles
    WHEN LOWER(COALESCE(up.role, 'viewer')) = 'admin' THEN 'org_admin'
    WHEN LOWER(COALESCE(up.role, 'viewer')) = 'manager' THEN 'org_manager'
    WHEN LOWER(COALESCE(up.role, 'viewer')) = 'accountant' THEN 'org_accountant'
    WHEN LOWER(COALESCE(up.role, 'viewer')) = 'auditor' THEN 'org_auditor'
    WHEN LOWER(COALESCE(up.role, 'viewer')) = 'viewer' THEN 'org_viewer'
    -- Default to viewer if no role found
    ELSE 'org_viewer'
  END as role,
  COALESCE(om.can_access_all_projects, true) as can_access_all_projects,
  COALESCE(om.created_at, NOW()) as created_at,
  om.user_id as created_by
FROM org_memberships om
LEFT JOIN user_profiles up ON up.id = om.user_id
WHERE NOT EXISTS (
  -- Don't migrate super admins (they're in system_roles)
  SELECT 1 FROM system_roles sr
  WHERE sr.user_id = om.user_id
  AND sr.role = 'super_admin'
)
ON CONFLICT (user_id, org_id, role) DO NOTHING;

-- =====================================================
-- 3. MIGRATE PROJECT MEMBERSHIPS TO PROJECT ROLES
-- =====================================================
-- Convert project_memberships to project_roles
-- Use user_profiles.role as the default role
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
  CASE 
    -- Map user profile roles to project-scoped roles
    WHEN LOWER(COALESCE(up.role, 'viewer')) IN ('admin', 'manager') THEN 'project_manager'
    WHEN LOWER(COALESCE(up.role, 'viewer')) IN ('accountant', 'team_leader') THEN 'project_contributor'
    WHEN LOWER(COALESCE(up.role, 'viewer')) IN ('auditor', 'viewer') THEN 'project_viewer'
    -- Default to contributor
    ELSE 'project_contributor'
  END as role,
  COALESCE(pm.created_at, NOW()) as created_at,
  pm.user_id as created_by
FROM project_memberships pm
LEFT JOIN user_profiles up ON up.id = pm.user_id
WHERE NOT EXISTS (
  -- Don't migrate super admins (they have access everywhere)
  SELECT 1 FROM system_roles sr
  WHERE sr.user_id = pm.user_id
  AND sr.role = 'super_admin'
)
ON CONFLICT (user_id, project_id, role) DO NOTHING;

-- =====================================================
-- 4. HANDLE USERS WITH ORG ACCESS BUT NO PROJECT ROLES
-- =====================================================
-- If user has can_access_all_projects=true in org,
-- create project roles for all projects in that org
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
  CASE 
    WHEN or1.role = 'org_admin' THEN 'project_manager'
    WHEN or1.role = 'org_manager' THEN 'project_manager'
    WHEN or1.role = 'org_accountant' THEN 'project_contributor'
    ELSE 'project_viewer'
  END as role,
  NOW() as created_at,
  or1.user_id as created_by
FROM org_roles or1
JOIN projects p ON p.org_id = or1.org_id
WHERE or1.can_access_all_projects = true
AND NOT EXISTS (
  -- Don't create if user already has a project role
  SELECT 1 FROM project_roles pr
  WHERE pr.user_id = or1.user_id
  AND pr.project_id = p.id
)
AND NOT EXISTS (
  -- Don't create for super admins
  SELECT 1 FROM system_roles sr
  WHERE sr.user_id = or1.user_id
  AND sr.role = 'super_admin'
)
ON CONFLICT (user_id, project_id, role) DO NOTHING;

-- =====================================================
-- 5. VERIFICATION QUERIES
-- =====================================================
-- Run these to verify migration success
-- =====================================================

DO $$
DECLARE
  system_count INTEGER;
  org_count INTEGER;
  project_count INTEGER;
  old_org_memberships_count INTEGER;
  old_project_memberships_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO system_count FROM system_roles;
  SELECT COUNT(*) INTO org_count FROM org_roles;
  SELECT COUNT(*) INTO project_count FROM project_roles;
  
  SELECT COUNT(*) INTO old_org_memberships_count FROM org_memberships;
  SELECT COUNT(*) INTO old_project_memberships_count FROM project_memberships;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'SCOPED ROLES MIGRATION - DATA SUMMARY';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'NEW TABLES:';
  RAISE NOTICE '  - system_roles: % records', system_count;
  RAISE NOTICE '  - org_roles: % records', org_count;
  RAISE NOTICE '  - project_roles: % records', project_count;
  RAISE NOTICE '';
  RAISE NOTICE 'OLD TABLES (for comparison):';
  RAISE NOTICE '  - org_memberships: % records', old_org_memberships_count;
  RAISE NOTICE '  - project_memberships: % records', old_project_memberships_count;
  RAISE NOTICE '==============================================';
END $$;

-- =====================================================
-- 6. CREATE COMPATIBILITY VIEWS (OPTIONAL)
-- =====================================================
-- These views allow old code to continue working
-- while you migrate to new scoped roles
-- =====================================================

-- View: org_memberships (compatibility)
CREATE OR REPLACE VIEW org_memberships_compat AS
SELECT DISTINCT
  id,
  user_id,
  org_id,
  can_access_all_projects,
  created_at,
  updated_at
FROM org_roles;

-- View: project_memberships (compatibility)
CREATE OR REPLACE VIEW project_memberships_compat AS
SELECT DISTINCT
  id,
  user_id,
  project_id,
  created_at,
  updated_at
FROM project_roles;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Verify data migration with queries above
-- 2. Update RLS policies (Phase 3)
-- 3. Update useOptimizedAuth hook (Phase 4)
-- 4. Test thoroughly
-- 5. Deprecate old tables when ready (Phase 5)
-- =====================================================

-- Sample verification queries:
-- SELECT * FROM system_roles;
-- SELECT * FROM org_roles LIMIT 10;
-- SELECT * FROM project_roles LIMIT 10;
-- 
-- -- Check specific user:
-- SELECT 'system' as scope, role FROM system_roles WHERE user_id = 'YOUR_USER_ID'
-- UNION ALL
-- SELECT 'org:' || org_id, role FROM org_roles WHERE user_id = 'YOUR_USER_ID'
-- UNION ALL
-- SELECT 'project:' || project_id, role FROM project_roles WHERE user_id = 'YOUR_USER_ID';
