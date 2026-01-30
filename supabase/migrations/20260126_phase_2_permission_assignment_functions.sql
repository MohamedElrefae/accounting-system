-- Phase 2: Permission Assignment Functions
-- Functions for assigning and revoking permissions to/from roles

-- assign_permission_to_role
CREATE OR REPLACE FUNCTION assign_permission_to_role(
  p_role_id int,
  p_permission_id int,
  p_org_id uuid
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_exists boolean;
  v_permission_exists boolean;
BEGIN
  -- Validate role exists
  SELECT EXISTS(SELECT 1 FROM roles WHERE id = p_role_id)
  INTO v_role_exists;
  
  IF NOT v_role_exists THEN
    RETURN QUERY SELECT false, 'Role not found'::text;
    RETURN;
  END IF;
  
  -- Validate permission exists
  SELECT EXISTS(SELECT 1 FROM permissions WHERE id = p_permission_id)
  INTO v_permission_exists;
  
  IF NOT v_permission_exists THEN
    RETURN QUERY SELECT false, 'Permission not found'::text;
    RETURN;
  END IF;
  
  -- Assign permission
  INSERT INTO role_permissions (role_id, permission_id)
  VALUES (p_role_id, p_permission_id)
  ON CONFLICT DO NOTHING;
  
  -- Log audit
  PERFORM log_audit(
    p_org_id,
    'PERMISSION_ASSIGNED',
    'role_permissions',
    p_role_id::text,
    NULL,
    jsonb_build_object('role_id', p_role_id, 'permission_id', p_permission_id)
  );
  
  RETURN QUERY SELECT true, 'Permission assigned successfully'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_permission_to_role TO authenticated;

-- revoke_permission_from_role
CREATE OR REPLACE FUNCTION revoke_permission_from_role(
  p_role_id int,
  p_permission_id int,
  p_org_id uuid
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete permission assignment
  DELETE FROM role_permissions
  WHERE role_id = p_role_id AND permission_id = p_permission_id;
  
  -- Log audit
  PERFORM log_audit(
    p_org_id,
    'PERMISSION_REVOKED',
    'role_permissions',
    p_role_id::text,
    jsonb_build_object('role_id', p_role_id, 'permission_id', p_permission_id),
    NULL
  );
  
  RETURN QUERY SELECT true, 'Permission revoked successfully'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION revoke_permission_from_role TO authenticated;

-- get_role_permissions
CREATE OR REPLACE FUNCTION get_role_permissions(
  p_role_id int,
  p_org_id uuid
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

GRANT EXECUTE ON FUNCTION get_role_permissions TO authenticated;
