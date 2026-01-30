-- Diagnose Project Selector Conflict
-- User: 5eeb26da-0c45-432c-a009-0977c76bfc47
-- Org: cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e

-- ============================================================================
-- STEP 1: Check org_memberships for this user
-- ============================================================================
SELECT 
  'org_memberships' as source,
  org_id,
  user_id,
  can_access_all_projects,
  is_default,
  created_at
FROM org_memberships
WHERE user_id = '5eeb26da-0c45-432c-a009-0977c76bfc47'
  AND org_id = 'cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e';

-- Expected: can_access_all_projects = true

-- ============================================================================
-- STEP 2: Check project_memberships for this user
-- ============================================================================
SELECT 
  'project_memberships' as source,
  pm.project_id,
  p.code as project_code,
  p.name as project_name,
  pm.org_id,
  pm.created_at
FROM project_memberships pm
JOIN projects p ON p.id = pm.project_id
WHERE pm.user_id = '5eeb26da-0c45-432c-a009-0977c76bfc47'
  AND pm.org_id = 'cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e';

-- This shows explicit project assignments

-- ============================================================================
-- STEP 3: Test get_user_accessible_projects RPC
-- ============================================================================
-- Run this as the user (set auth.uid())
SELECT 
  'RPC: get_user_accessible_projects' as source,
  id,
  code,
  name,
  status
FROM get_user_accessible_projects('cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e'::uuid)
ORDER BY code;

-- Expected: ALL projects in org (because can_access_all_projects = true)

-- ============================================================================
-- STEP 4: Check ALL projects in org (what SHOULD be returned)
-- ============================================================================
SELECT 
  'ALL projects in org' as source,
  id,
  code,
  name,
  status,
  created_at
FROM projects
WHERE org_id = 'cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e'
  AND status = 'active'
ORDER BY code;

-- This is what the RPC SHOULD return

-- ============================================================================
-- STEP 5: Check if RPC function exists
-- ============================================================================
SELECT 
  'RPC function check' as source,
  proname as function_name,
  prosecdef as is_security_definer,
  proargnames as argument_names,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'get_user_accessible_projects';

-- ============================================================================
-- STEP 6: Check ScopeContext - what's being called?
-- ============================================================================
-- This needs to be checked in the browser console:
-- 1. Open browser DevTools (F12)
-- 2. Go to Network tab
-- 3. Filter by "rpc" or "projects"
-- 4. Select organization
-- 5. Check which function is being called

-- ============================================================================
-- STEP 7: Check if old getActiveProjectsByOrg is being used
-- ============================================================================
-- Check if there's a direct query instead of RPC call
-- This would bypass the access control logic

-- ============================================================================
-- DIAGNOSTIC SUMMARY
-- ============================================================================
-- If RPC returns ALL projects but UI shows only one:
--   → ScopeContext is NOT calling the RPC
--   → It's using old direct query or cached data
--
-- If RPC returns only one project:
--   → RPC logic is wrong (check function definition)
--   → org_memberships.can_access_all_projects might be false
--
-- If RPC doesn't exist:
--   → Migration not deployed
--   → Need to run: supabase/migrations/20260126_phase_2_get_user_accessible_projects_v2.sql
