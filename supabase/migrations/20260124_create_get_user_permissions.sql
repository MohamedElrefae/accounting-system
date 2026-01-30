-- PHASE 1: Create get_user_permissions() RPC Function
-- Date: January 24, 2026
-- Purpose: Returns user's permissions
-- Note: Deploy AFTER v3 migration succeeds
-- Note: user_roles doesn't have org_id, so we return all permissions for user's roles

-- ============================================================================
-- RPC FUNCTION: get_user_permissions()
-- Purpose: Returns user's permissions across all their roles
-- Returns: TABLE(permission_id int, permission_name text, resource text, action text)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_user_permissions() CASCADE;

CREATE FUNCTION public.get_user_permissions()
RETURNS TABLE(permission_id int, permission_name text, resource text, action text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.id as permission_id,
    p.name as permission_name,
    p.resource,
    p.action
  FROM user_roles ur
  INNER JOIN roles r ON ur.role_id = r.id
  INNER JOIN role_permissions rp ON r.id = rp.role_id
  INNER JOIN permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
  ORDER BY p.resource, p.action;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_permissions() TO authenticated;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_permissions'
ORDER BY routine_name;
