-- Phase 2 Task 2.2: Get User Accessible Projects RPC
-- 
-- ACCESS HIERARCHY (Priority Order):
-- 1. org_memberships.can_access_all_projects = true → OVERRIDES everything
--    Returns ALL active projects in the organization
-- 
-- 2. org_memberships.can_access_all_projects = false → Restricted access
--    Returns ONLY projects where user has explicit project_memberships entry
--
-- SECURITY: Runs with SECURITY DEFINER to enforce access control at database level

DROP FUNCTION IF EXISTS get_user_accessible_projects(uuid) CASCADE;

CREATE FUNCTION get_user_accessible_projects(p_org_id uuid)
RETURNS TABLE(
  id uuid,
  org_id uuid,
  code varchar,
  name varchar,
  description text,
  status varchar,
  budget_amount numeric,
  start_date date,
  end_date date,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $
  WITH user_org_access AS (
    -- Get user's org membership and access level
    SELECT 
      om.can_access_all_projects,
      om.org_id
    FROM org_memberships om
    WHERE om.org_id = p_org_id
      AND om.user_id = auth.uid()
  )
  SELECT 
    p.id,
    p.org_id,
    p.code,
    p.name,
    p.description,
    p.status,
    p.budget_amount,
    p.start_date,
    p.end_date,
    p.created_at,
    p.updated_at
  FROM projects p
  WHERE p.org_id = p_org_id
    AND p.status = 'active'
    AND (
      -- PRIORITY 1: If org_memberships.can_access_all_projects = true
      -- User sees ALL projects in the organization (OVERRIDES project_memberships)
      (SELECT can_access_all_projects FROM user_org_access) = true
      OR
      -- PRIORITY 2: If org_memberships.can_access_all_projects = false
      -- User sees ONLY projects they have explicit membership for
      (
        (SELECT can_access_all_projects FROM user_org_access) = false
        AND EXISTS (
          SELECT 1 FROM project_memberships pm
          WHERE pm.project_id = p.id
            AND pm.user_id = auth.uid()
            AND pm.org_id = p_org_id
        )
      )
    )
  ORDER BY p.code ASC;
$;

GRANT EXECUTE ON FUNCTION get_user_accessible_projects(uuid) TO authenticated;
