-- Phase 2: Role Assignment Functions
-- Functions for assigning and revoking roles to/from users

-- assign_role_to_user
CREATE OR REPLACE FUNCTION assign_role_to_user(
  p_user_id uuid,
  p_role_id int,
  p_org_id uuid
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_exists boolean;
  v_user_exists boolean;
  v_org_exists boolean;
BEGIN
  -- Validate org exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = p_org_id)
  INTO v_org_exists;
  
  IF NOT v_org_exists THEN
    RETURN QUERY SELECT false, 'Organization not found'::text;
    RETURN;
  END IF;
  
  -- Validate user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id)
  INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RETURN QUERY SELECT false, 'User not found'::text;
    RETURN;
  END IF;
  
  -- Validate role exists
  SELECT EXISTS(SELECT 1 FROM roles WHERE id = p_role_id)
  INTO v_role_exists;
  
  IF NOT v_role_exists THEN
    RETURN QUERY SELECT false, 'Role not found'::text;
    RETURN;
  END IF;
  
  -- Assign role
  INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at, is_active)
  VALUES (p_user_id, p_role_id, auth.uid(), now(), true)
  ON CONFLICT DO NOTHING;
  
  -- Log audit
  PERFORM log_audit(
    p_org_id,
    'ROLE_ASSIGNED',
    'user_roles',
    p_user_id::text,
    NULL,
    jsonb_build_object('user_id', p_user_id, 'role_id', p_role_id)
  );
  
  RETURN QUERY SELECT true, 'Role assigned successfully'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_role_to_user TO authenticated;

-- revoke_role_from_user
CREATE OR REPLACE FUNCTION revoke_role_from_user(
  p_user_id uuid,
  p_role_id int,
  p_org_id uuid
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete role assignment
  DELETE FROM user_roles
  WHERE user_id = p_user_id AND role_id = p_role_id;
  
  -- Log audit
  PERFORM log_audit(
    p_org_id,
    'ROLE_REVOKED',
    'user_roles',
    p_user_id::text,
    jsonb_build_object('user_id', p_user_id, 'role_id', p_role_id),
    NULL
  );
  
  RETURN QUERY SELECT true, 'Role revoked successfully'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION revoke_role_from_user TO authenticated;

-- get_user_roles
CREATE OR REPLACE FUNCTION get_user_roles(
  p_user_id uuid,
  p_org_id uuid
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
    AND ur.is_active = true
  ORDER BY r.name;
$$;

GRANT EXECUTE ON FUNCTION get_user_roles TO authenticated;
