-- Diagnose Real User Data in Supabase
-- This script shows what real data exists for testing

-- 1. Check all users in the system
SELECT 'USERS' as section;
SELECT id, email, name FROM user_profiles LIMIT 20;

-- 2. Check organizations
SELECT 'ORGANIZATIONS' as section;
SELECT id, name, created_by FROM organizations LIMIT 20;

-- 3. Check org memberships
SELECT 'ORG MEMBERSHIPS' as section;
SELECT om.user_id, om.org_id, om.role, up.email, o.name
FROM org_memberships om
JOIN user_profiles up ON om.user_id = up.id
JOIN organizations o ON om.org_id = o.id
LIMIT 20;

-- 4. Check projects
SELECT 'PROJECTS' as section;
SELECT id, name, org_id FROM projects LIMIT 20;

-- 5. Check project memberships
SELECT 'PROJECT MEMBERSHIPS' as section;
SELECT pm.user_id, pm.project_id, pm.role, up.email, p.name
FROM project_memberships pm
JOIN user_profiles up ON pm.user_id = up.id
JOIN projects p ON pm.project_id = p.id
LIMIT 20;

-- 6. Check current authenticated user
SELECT 'CURRENT AUTH USER' as section;
SELECT auth.uid() as current_user_id;

-- 7. Find users with organizations
SELECT 'USERS WITH ORGANIZATIONS' as section;
SELECT DISTINCT up.id, up.email, up.name, COUNT(om.org_id) as org_count
FROM user_profiles up
LEFT JOIN org_memberships om ON up.id = om.user_id
GROUP BY up.id, up.email, up.name
HAVING COUNT(om.org_id) > 0
LIMIT 20;

-- 8. Find users without organizations
SELECT 'USERS WITHOUT ORGANIZATIONS' as section;
SELECT up.id, up.email, up.name
FROM user_profiles up
LEFT JOIN org_memberships om ON up.id = om.user_id
WHERE om.org_id IS NULL
LIMIT 20;

-- 9. Count summary
SELECT 'SUMMARY' as section;
SELECT 
  (SELECT COUNT(*) FROM user_profiles) as total_users,
  (SELECT COUNT(*) FROM organizations) as total_orgs,
  (SELECT COUNT(*) FROM org_memberships) as total_org_memberships,
  (SELECT COUNT(*) FROM projects) as total_projects,
  (SELECT COUNT(*) FROM project_memberships) as total_project_memberships;
