-- Diagnose and fix project filtering issue in scoped context
-- This script checks if the RPC exists and works correctly

-- ============================================================================
-- STEP 1: Check if RPC exists and is accessible
-- ============================================================================
SELECT 
  'RPC_EXISTS_CHECK' as check_type,
  proname as function_name,
  pronargs as argument_count,
  proargtypes as argument_types,
  prosecdef as security_definer,
  prolang as language
FROM pg_proc 
WHERE proname = 'get_user_accessible_projects';

-- ============================================================================
-- STEP 2: Test RPC with a specific org (replace with actual org ID)
-- ============================================================================
-- NOTE: Replace 'YOUR_ORG_ID_HERE' with an actual organization ID from your database
-- You can get one by running: SELECT id, code, name FROM organizations LIMIT 1;

-- Test the RPC function directly (this will show if it works)
-- SELECT * FROM get_user_accessible_projects('YOUR_ORG_ID_HERE'::uuid);

-- ============================================================================
-- STEP 3: Check user organization memberships
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
-- STEP 4: Check user project memberships
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
-- STEP 5: Check what projects should be available for a specific org
-- ============================================================================
-- Replace 'YOUR_ORG_ID_HERE' with actual org ID
SELECT 
  'ALL_ACTIVE_PROJECTS_IN_ORG' as check_type,
  p.id,
  p.code,
  p.name,
  p.status,
  p.org_id
FROM projects p
WHERE p.org_id = 'YOUR_ORG_ID_HERE'::uuid
  AND p.status = 'active'
ORDER BY p.code;

-- ============================================================================
-- STEP 6: Manual verification of expected behavior
-- ============================================================================
-- This query shows what the RPC SHOULD return by implementing the logic manually
-- Replace 'YOUR_ORG_ID_HERE' with actual org ID
WITH user_org_access AS (
  SELECT 
    om.can_access_all_projects,
    om.org_id
  FROM org_memberships om
  WHERE om.org_id = 'YOUR_ORG_ID_HERE'::uuid
    AND om.user_id = auth.uid()
)
SELECT 
  'MANUAL_RPC_LOGIC' as check_type,
  p.id,
  p.code,
  p.name,
  p.status,
  (SELECT can_access_all_projects FROM user_org_access) as user_can_access_all_projects,
  CASE 
    WHEN (SELECT can_access_all_projects FROM user_org_access) = true THEN 'ALL_PROJECTS'
    WHEN EXISTS (
      SELECT 1 FROM project_memberships pm
      WHERE pm.project_id = p.id
        AND pm.user_id = auth.uid()
        AND pm.org_id = p.org_id
    ) THEN 'EXPLICIT_MEMBERSHIP'
    ELSE 'NO_ACCESS'
  END as access_reason
FROM projects p
WHERE p.org_id = 'YOUR_ORG_ID_HERE'::uuid
  AND p.status = 'active'
  AND (
    (SELECT can_access_all_projects FROM user_org_access) = true
    OR (
      (SELECT can_access_all_projects FROM user_org_access) = false
      AND EXISTS (
        SELECT 1 FROM project_memberships pm
        WHERE pm.project_id = p.id
          AND pm.user_id = auth.uid()
          AND pm.org_id = p.org_id
      )
    )
  )
ORDER BY p.code;
