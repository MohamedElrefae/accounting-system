-- Create a function to get projects accessible by the current user for a specific organization
CREATE OR REPLACE FUNCTION get_user_accessible_projects(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  code VARCHAR(20),
  name VARCHAR(255),
  description TEXT,
  status VARCHAR(20),
  org_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  start_date DATE,
  end_date DATE,
  budget_amount NUMERIC,
  created_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.code,
    p.name,
    p.description,
    p.status,
    p.org_id,
    p.created_at,
    p.updated_at,
    p.start_date,
    p.end_date,
    p.budget_amount,
    p.created_by
  FROM projects p
  WHERE p.org_id = p_org_id
  AND (
    -- User is super admin
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.is_super_admin = true
    )
    OR
    -- User is member of the organization
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.user_id = auth.uid()
      AND om.org_id = p_org_id
    )
  )
  ORDER BY p.code ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_accessible_projects(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_projects(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_user_accessible_projects(UUID) TO service_role;
