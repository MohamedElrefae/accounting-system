-- Phase 2: Filtered Permissions Function
-- Function for getting user-specific permissions filtered by org

-- get_user_permissions_filtered
CREATE OR REPLACE FUNCTION get_user_permissions_filtered(
  p_org_id uuid
)
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
    AND ur.is_active = true
  ORDER BY p.resource, p.action;
$$;

GRANT EXECUTE ON FUNCTION get_user_permissions_filtered TO authenticated;
