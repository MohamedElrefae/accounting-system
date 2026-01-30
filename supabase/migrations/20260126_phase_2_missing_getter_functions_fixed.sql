-- Phase 2 Task 2.2: Missing Getter Functions and Project Access Validation
-- ARCHITECTURE NOTE: Project access is managed via project_memberships table
-- Users must be explicitly assigned to projects to access them

-- ============================================================================
-- 1. CREATE get_user_roles() FUNCTION
-- Returns all roles for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_roles(
  p_user_id uuid
)
RETURNS TABLE(role_id int, role_name text, description text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id,
    r.name,
    r.description
  FROM roles r
  INNER JOIN user_roles ur ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id
    AND ur.is_active = TRUE
  ORDER BY r.name;
$$;

GRANT EXECUTE ON FUNCTION get_user_roles(uuid) TO authenticated;

-- ============================================================================
-- 2. CREATE get_role_permissions() FUNCTION
-- Returns all permissions for a role
-- ============================================================================

CREATE OR REPLACE FUNCTION get_role_permissions(
  p_role_id int
)
RETURNS TABLE(permission_id int, permission_name text, resource text, action text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.resource,
    p.action
  FROM permissions p
  INNER JOIN role_permissions rp ON p.id = rp.permission_id
  WHERE rp.role_id = p_role_id
  ORDER BY p.resource, p.action;
$$;

GRANT EXECUTE ON FUNCTION get_role_permissions(int) TO authenticated;

-- ============================================================================
-- 3. CREATE get_user_permissions_filtered() FUNCTION
-- Returns all permissions for current user's roles
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_permissions_filtered()
RETURNS TABLE(permission_id int, permission_name text, resource text, action text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.id,
    p.name,
    p.resource,
    p.action
  FROM permissions p
  INNER JOIN role_permissions rp ON p.id = rp.permission_id
  INNER JOIN roles r ON rp.role_id = r.id
  INNER JOIN user_roles ur ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
    AND ur.is_active = TRUE
  ORDER BY p.resource, p.action;
$$;

GRANT EXECUTE ON FUNCTION get_user_permissions_filtered() TO authenticated;

-- ============================================================================
-- 4. CREATE check_project_access() FUNCTION
-- Validates if user has access to a project via project_memberships
-- ============================================================================

CREATE OR REPLACE FUNCTION check_project_access(
  p_project_id uuid,
  p_org_id uuid
)
RETURNS TABLE(has_access boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_project_exists boolean;
  v_user_has_access boolean;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false;
    RETURN;
  END IF;
  
  -- Check if project exists in org
  SELECT EXISTS(
    SELECT 1 FROM projects
    WHERE id = p_project_id
    AND org_id = p_org_id
  ) INTO v_project_exists;
  
  IF NOT v_project_exists THEN
    RETURN QUERY SELECT false;
    RETURN;
  END IF;
  
  -- Check if user has access to project via project_memberships
  -- User has access if they have an active project membership
  SELECT EXISTS(
    SELECT 1 FROM project_memberships pm
    WHERE pm.project_id = p_project_id
    AND pm.user_id = v_user_id
    AND pm.org_id = p_org_id
  ) INTO v_user_has_access;
  
  RETURN QUERY SELECT v_user_has_access;
END;
$$;

GRANT EXECUTE ON FUNCTION check_project_access(uuid, uuid) TO authenticated;
