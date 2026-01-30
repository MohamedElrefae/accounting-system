-- Phase 2 Task 2.2: Get User Accessible Projects RPC
-- Returns projects based on org_memberships.can_access_all_projects flag
-- If can_access_all_projects = true: return ALL projects in org
-- If can_access_all_projects = false: return ONLY projects user has membership for

-- Drop existing function if it exists with different signature
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
AS $$
  WITH user_org_access AS (
    SELECT 
      om.can_access_all_projects
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
      -- If user has can_access_all_projects = true, show all projects
      (SELECT can_access_all_projects FROM user_org_access) = true
      OR
      -- Otherwise, only show projects user has explicit membership for
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
$$;

GRANT EXECUTE ON FUNCTION get_user_accessible_projects(uuid) TO authenticated;
