-- PHASE 1: Create Auth RPC Functions - FINAL WORKING VERSION
-- Date: January 24, 2026
-- Purpose: Create 3 working RPC functions for auth and scope management
-- Note: Deploy AFTER v3 migration succeeds

-- ============================================================================
-- CLEANUP: Drop existing functions if they exist
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_user_permissions() CASCADE;

-- ============================================================================
-- RPC FUNCTION: get_user_permissions()
-- Purpose: Returns user's permissions across all their roles
-- Returns: TABLE(permission_id int, permission_name text, resource text, action text)
-- ============================================================================

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
  FROM roles r
  INNER JOIN role_permissions rp ON r.id = rp.role_id
  INNER JOIN permissions p ON rp.permission_id = p.id
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
