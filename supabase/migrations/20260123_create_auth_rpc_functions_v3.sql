-- PHASE 1: Create Enhanced Auth RPC Functions (v3 - Final Working Version)
-- Date: January 24, 2026
-- Purpose: Create RPC functions for auth and scope management

-- ============================================================================
-- CLEANUP: Drop existing functions if they exist
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_user_orgs() CASCADE;
DROP FUNCTION IF EXISTS public.check_org_access(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_scope() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_scope(uuid, uuid) CASCADE;

-- ============================================================================
-- RPC FUNCTION 1: get_user_orgs()
-- Purpose: Returns organizations user belongs to
-- Returns: TABLE(id uuid, name text, member_count int)
-- ============================================================================

CREATE FUNCTION public.get_user_orgs()
RETURNS TABLE(id uuid, name text, member_count int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    o.id,
    o.name,
    COUNT(*)::int as member_count
  FROM organizations o
  INNER JOIN org_memberships om ON o.id = om.org_id
  WHERE om.user_id = auth.uid()
  GROUP BY o.id, o.name
  ORDER BY o.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_orgs() TO authenticated;

-- ============================================================================
-- RPC FUNCTION 2: check_org_access()
-- Purpose: Verifies user has access to specific organization
-- Parameters: org_id uuid
-- Returns: boolean
-- ============================================================================

CREATE FUNCTION public.check_org_access(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM org_memberships
    WHERE user_id = auth.uid()
      AND org_id = $1
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_org_access(uuid) TO authenticated;

-- ============================================================================
-- RPC FUNCTION 3: get_user_scope()
-- Purpose: Returns user's first organization (for scope initialization)
-- Returns: TABLE(org_id uuid, org_name text)
-- ============================================================================

CREATE FUNCTION public.get_user_scope()
RETURNS TABLE(org_id uuid, org_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    o.id as org_id,
    o.name as org_name
  FROM organizations o
  INNER JOIN org_memberships om ON o.id = om.org_id
  WHERE om.user_id = auth.uid()
  ORDER BY o.name
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_scope() TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all functions created successfully
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_orgs',
    'check_org_access',
    'get_user_scope'
  )
ORDER BY routine_name;
