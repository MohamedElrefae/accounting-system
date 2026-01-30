-- ============================================================================
-- Migration: Enhance RPC Functions with Audit Logging
-- Date: January 25, 2026
-- Purpose: Add audit logging to existing role/permission assignment functions
-- ============================================================================

-- ============================================================================
-- SECTION 1: Enhanced save_role_permissions() with audit logging
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_role_permissions(
  p_role_id INT,
  p_permission_ids INT[],
  p_org_id UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  permissions_assigned INT,
  audit_logged BOOLEAN
) AS $$
DECLARE
  v_current_user UUID;
  v_permission_id INT;
  v_count INT := 0;
  v_audit_logged BOOLEAN := FALSE;
BEGIN
  v_current_user := auth.uid();

  -- Validate inputs
  IF p_role_id IS NULL OR p_permission_ids IS NULL OR array_length(p_permission_ids, 1) = 0 THEN
    RETURN QUERY SELECT FALSE, 'Invalid role_id or permission_ids', 0, FALSE;
    RETURN;
  END IF;

  -- Delete existing permissions for this role
  DELETE FROM public.role_permissions WHERE role_id = p_role_id;

  -- Insert new permissions
  FOREACH v_permission_id IN ARRAY p_permission_ids LOOP
    INSERT INTO public.role_permissions (role_id, permission_id, granted_by, granted_at)
    VALUES (p_role_id, v_permission_id, v_current_user, NOW())
    ON CONFLICT DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;

  -- Log to audit_logs
  INSERT INTO public.audit_logs (
    user_id,
    org_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    v_current_user,
    p_org_id,
    'BULK_PERMISSION_ASSIGNMENT',
    'role_permissions',
    p_role_id::text,
    NULL,
    jsonb_build_object(
      'role_id', p_role_id,
      'permission_ids', p_permission_ids,
      'count', v_count
    ),
    NOW()
  );

  v_audit_logged := TRUE;

  RETURN QUERY SELECT TRUE, 'Permissions saved successfully', v_count, v_audit_logged;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.save_role_permissions(INT, INT[], UUID) TO authenticated;

---

-- ============================================================================
-- SECTION 2: Enhanced emergency_assign_all_permissions_to_role() with audit
-- ============================================================================

CREATE OR REPLACE FUNCTION public.emergency_assign_all_permissions_to_role(
  p_role_id INT,
  p_org_id UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  permissions_assigned INT,
  audit_logged BOOLEAN
) AS $$
DECLARE
  v_current_user UUID;
  v_permission_id INT;
  v_count INT := 0;
  v_audit_logged BOOLEAN := FALSE;
BEGIN
  v_current_user := auth.uid();

  -- Validate role exists
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE id = p_role_id) THEN
    RETURN QUERY SELECT FALSE, 'Role not found', 0, FALSE;
    RETURN;
  END IF;

  -- Delete existing permissions
  DELETE FROM public.role_permissions WHERE role_id = p_role_id;

  -- Assign all permissions
  INSERT INTO public.role_permissions (role_id, permission_id, granted_by, granted_at)
  SELECT p_role_id, id, v_current_user, NOW()
  FROM public.permissions;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Log to audit_logs
  INSERT INTO public.audit_logs (
    user_id,
    org_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    v_current_user,
    p_org_id,
    'EMERGENCY_ALL_PERMISSIONS_ASSIGNED',
    'role_permissions',
    p_role_id::text,
    NULL,
    jsonb_build_object(
      'role_id', p_role_id,
      'action', 'EMERGENCY_ASSIGN_ALL',
      'count', v_count
    ),
    NOW()
  );

  v_audit_logged := TRUE;

  RETURN QUERY SELECT TRUE, 'All permissions assigned (EMERGENCY)', v_count, v_audit_logged;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.emergency_assign_all_permissions_to_role(INT, UUID) TO authenticated;

---

-- ============================================================================
-- SECTION 3: Enhanced multi_assign_permissions_to_roles() with audit
-- ============================================================================

CREATE OR REPLACE FUNCTION public.multi_assign_permissions_to_roles(
  p_role_ids INT[],
  p_permission_ids INT[],
  p_org_id UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  total_assignments INT,
  audit_logged BOOLEAN
) AS $$
DECLARE
  v_current_user UUID;
  v_role_id INT;
  v_permission_id INT;
  v_count INT := 0;
  v_audit_logged BOOLEAN := FALSE;
BEGIN
  v_current_user := auth.uid();

  -- Validate inputs
  IF p_role_ids IS NULL OR p_permission_ids IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Invalid role_ids or permission_ids', 0, FALSE;
    RETURN;
  END IF;

  -- Assign permissions to each role
  FOREACH v_role_id IN ARRAY p_role_ids LOOP
    FOREACH v_permission_id IN ARRAY p_permission_ids LOOP
      INSERT INTO public.role_permissions (role_id, permission_id, granted_by, granted_at)
      VALUES (v_role_id, v_permission_id, v_current_user, NOW())
      ON CONFLICT DO NOTHING;
      
      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  -- Log to audit_logs
  INSERT INTO public.audit_logs (
    user_id,
    org_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    v_current_user,
    p_org_id,
    'BULK_MULTI_ROLE_PERMISSION_ASSIGNMENT',
    'role_permissions',
    array_to_string(p_role_ids, ','),
    NULL,
    jsonb_build_object(
      'role_ids', p_role_ids,
      'permission_ids', p_permission_ids,
      'total_assignments', v_count
    ),
    NOW()
  );

  v_audit_logged := TRUE;

  RETURN QUERY SELECT TRUE, 'Permissions assigned to multiple roles', v_count, v_audit_logged;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.multi_assign_permissions_to_roles(INT[], INT[], UUID) TO authenticated;

---

-- ============================================================================
-- SECTION 4: New function to assign role to user with audit
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assign_role_to_user(
  p_user_id UUID,
  p_role_id INT,
  p_org_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  audit_logged BOOLEAN
) AS $$
DECLARE
  v_current_user UUID;
  v_audit_logged BOOLEAN := FALSE;
BEGIN
  v_current_user := auth.uid();

  -- Validate inputs
  IF p_user_id IS NULL OR p_role_id IS NULL OR p_org_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Invalid user_id, role_id, or org_id', FALSE;
    RETURN;
  END IF;

  -- Insert user role
  INSERT INTO public.user_roles (user_id, role_id, organization_id, is_active, granted_by, granted_at)
  VALUES (p_user_id, p_role_id, p_org_id, TRUE, v_current_user, NOW())
  ON CONFLICT (user_id, role_id, organization_id) DO UPDATE
  SET is_active = TRUE, granted_by = v_current_user, granted_at = NOW();

  -- Log to audit_logs
  INSERT INTO public.audit_logs (
    user_id,
    org_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    v_current_user,
    p_org_id,
    'ROLE_ASSIGNED_TO_USER',
    'user_roles',
    p_user_id::text,
    NULL,
    jsonb_build_object(
      'user_id', p_user_id,
      'role_id', p_role_id,
      'organization_id', p_org_id
    ),
    NOW()
  );

  v_audit_logged := TRUE;

  RETURN QUERY SELECT TRUE, 'Role assigned to user', v_audit_logged;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.assign_role_to_user(UUID, INT, UUID) TO authenticated;

---

-- ============================================================================
-- SECTION 5: New function to revoke role from user with audit
-- ============================================================================

CREATE OR REPLACE FUNCTION public.revoke_role_from_user(
  p_user_id UUID,
  p_role_id INT,
  p_org_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  audit_logged BOOLEAN
) AS $$
DECLARE
  v_current_user UUID;
  v_audit_logged BOOLEAN := FALSE;
BEGIN
  v_current_user := auth.uid();

  -- Validate inputs
  IF p_user_id IS NULL OR p_role_id IS NULL OR p_org_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Invalid user_id, role_id, or org_id', FALSE;
    RETURN;
  END IF;

  -- Delete user role
  DELETE FROM public.user_roles
  WHERE user_id = p_user_id
    AND role_id = p_role_id
    AND organization_id = p_org_id;

  -- Log to audit_logs
  INSERT INTO public.audit_logs (
    user_id,
    org_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    v_current_user,
    p_org_id,
    'ROLE_REVOKED_FROM_USER',
    'user_roles',
    p_user_id::text,
    jsonb_build_object(
      'user_id', p_user_id,
      'role_id', p_role_id,
      'organization_id', p_org_id
    ),
    NULL,
    NOW()
  );

  v_audit_logged := TRUE;

  RETURN QUERY SELECT TRUE, 'Role revoked from user', v_audit_logged;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.revoke_role_from_user(UUID, INT, UUID) TO authenticated;

---

-- ============================================================================
-- SECTION 6: Verification Queries
-- ============================================================================

-- Verify enhanced functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'save_role_permissions',
    'emergency_assign_all_permissions_to_role',
    'multi_assign_permissions_to_roles',
    'assign_role_to_user',
    'revoke_role_from_user'
  )
ORDER BY routine_name;

-- Verify audit_logs table exists and has data
SELECT 
  COUNT(*) as total_audit_logs,
  COUNT(DISTINCT action) as unique_actions,
  MAX(created_at) as latest_audit
FROM public.audit_logs;
