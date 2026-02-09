-- Diagnose scope context issue for superadmin with no projects showing
-- Run this in Supabase SQL Editor to identify the problem

-- ============================================================================
-- STEP 1: Check current user and authentication
-- ============================================================================
SELECT 
    'CURRENT_USER' as check_type,
    auth.uid() as user_id,
    auth.email() as user_email,
    auth.role() as user_role;

-- ============================================================================
-- STEP 2: Check if RPC function exists
-- ============================================================================
SELECT 
    'RPC_EXISTS' as check_type,
    proname as function_name,
    prosecdef as security_definer,
    prolang as language
FROM pg_proc 
WHERE proname = 'get_user_accessible_projects';

-- ============================================================================
-- STEP 3: Get your organization memberships
-- ============================================================================
SELECT 
    'USER_ORG_MEMBERSHIPS' as check_type,
    om.org_id,
    o.code as org_code,
    o.name as org_name,
    om.user_id,
    om.can_access_all_projects,
    om.role,
    om.created_at
FROM org_memberships om
JOIN organizations o ON o.id = om.org_id
WHERE om.user_id = auth.uid()
ORDER BY o.code;

-- ============================================================================
-- STEP 4: Get all organizations to see what's available
-- ============================================================================
SELECT 
    'ALL_ORGANIZATIONS' as check_type,
    id,
    code,
    name,
    status
FROM organizations
ORDER BY code;

-- ============================================================================
-- STEP 5: For each org, check what projects should be available
-- ============================================================================
-- First get your org IDs, then run this for each one
SELECT 
    'ALL_ACTIVE_PROJECTS' as check_type,
    p.id,
    p.code,
    p.name,
    p.status,
    p.org_id,
    o.code as org_code,
    o.name as org_name
FROM projects p
JOIN organizations o ON o.id = p.org_id
WHERE p.status = 'active'
ORDER BY o.code, p.code;

-- ============================================================================
-- STEP 6: Test RPC function for each organization you're a member of
-- ============================================================================
-- Replace each org_id from step 3 in these queries:
-- SELECT * FROM get_user_accessible_projects('ORG_ID_HERE'::uuid);

-- ============================================================================
-- STEP 7: Check project memberships
-- ============================================================================
SELECT 
    'USER_PROJECT_MEMBERSHIPS' as check_type,
    pm.project_id,
    p.code as project_code,
    p.name as project_name,
    pm.org_id,
    o.code as org_code,
    pm.user_id,
    pm.role,
    pm.can_create,
    pm.can_edit,
    pm.can_delete,
    pm.can_approve
FROM project_memberships pm
JOIN projects p ON p.id = pm.project_id
JOIN organizations o ON o.id = pm.org_id
WHERE pm.user_id = auth.uid()
ORDER BY o.code, p.code;

-- ============================================================================
-- STEP 8: Manual verification of RPC logic for your orgs
-- ============================================================================
-- This simulates what the RPC should return
WITH user_orgs AS (
  SELECT DISTINCT om.org_id, om.can_access_all_projects
  FROM org_memberships om
  WHERE om.user_id = auth.uid()
)
SELECT 
    'EXPECTED_RPC_RESULTS' as check_type,
    p.id,
    p.code,
    p.name,
    p.org_id,
    o.code as org_code,
    uo.can_access_all_projects,
    CASE 
        WHEN uo.can_access_all_projects = true THEN 'ALL_PROJECTS_ACCESS'
        WHEN EXISTS (
            SELECT 1 FROM project_memberships pm
            WHERE pm.project_id = p.id
              AND pm.user_id = auth.uid()
              AND pm.org_id = p.org_id
        ) THEN 'EXPLICIT_PROJECT_ACCESS'
        ELSE 'NO_ACCESS'
    END as access_reason
FROM projects p
JOIN organizations o ON o.id = p.org_id
JOIN user_orgs uo ON uo.org_id = p.org_id
WHERE p.status = 'active'
  AND (
    uo.can_access_all_projects = true
    OR (
        uo.can_access_all_projects = false
        AND EXISTS (
            SELECT 1 FROM project_memberships pm
            WHERE pm.project_id = p.id
              AND pm.user_id = auth.uid()
              AND pm.org_id = p.org_id
        )
    )
  )
ORDER BY o.code, p.code;
