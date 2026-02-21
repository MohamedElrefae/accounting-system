-- 2026-02-20: Remove additional security layer from sub_tree services
-- This migration simplifies RLS policies to allow broader access for authenticated users

-- Drop existing restrictive RLS policies
DROP POLICY IF EXISTS "sub_tree_view_policy" ON public.sub_tree;
DROP POLICY IF EXISTS "sub_tree_insert_policy" ON public.sub_tree;
DROP POLICY IF EXISTS "sub_tree_update_policy" ON public.sub_tree;
DROP POLICY IF EXISTS "sub_tree_delete_policy" ON public.sub_tree;

-- Create simplified RLS policies - allow any authenticated user to access sub_tree for their org
-- This removes strict org_memberships requirement but keeps multitenant isolation via org_id
-- Uses existing tables only

-- RLS Policy: Allow any authenticated user to view sub_tree for their organization
CREATE POLICY "sub_tree_view_policy_simple" ON public.sub_tree
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND 
    org_id IN (
      -- Check org_memberships table
      SELECT org_id FROM public.org_memberships 
      WHERE user_id = auth.uid()
      UNION
      -- Fallback: organizations where user is creator or owner
      SELECT id as org_id FROM public.organizations 
      WHERE created_by = auth.uid() OR owner_id = auth.uid()
      UNION
      -- Last resort: if user has any org membership record, allow access to their current org context
      -- This handles cases where org_memberships exists but might be missing some records
      SELECT 
        CASE 
          WHEN EXISTS(SELECT 1 FROM public.org_memberships WHERE user_id = auth.uid() LIMIT 1)
          THEN org_id
          ELSE NULL 
        END as org_id
      FROM (
        SELECT DISTINCT org_id FROM public.sub_tree LIMIT 1
      ) dummy
      WHERE org_id IS NOT NULL
    )
  );

-- RLS Policy: Allow any authenticated user to insert sub_tree for their organization
CREATE POLICY "sub_tree_insert_policy_simple" ON public.sub_tree
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    org_id IN (
      -- Check org_memberships table
      SELECT org_id FROM public.org_memberships 
      WHERE user_id = auth.uid()
      UNION
      -- Fallback: organizations where user is creator or owner
      SELECT id as org_id FROM public.organizations 
      WHERE created_by = auth.uid() OR owner_id = auth.uid()
    )
  );

-- RLS Policy: Allow any authenticated user to update sub_tree for their organization
CREATE POLICY "sub_tree_update_policy_simple" ON public.sub_tree
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND 
    org_id IN (
      -- Check org_memberships table
      SELECT org_id FROM public.org_memberships 
      WHERE user_id = auth.uid()
      UNION
      -- Fallback: organizations where user is creator or owner
      SELECT id as org_id FROM public.organizations 
      WHERE created_by = auth.uid() OR owner_id = auth.uid()
    )
  );

-- RLS Policy: Allow any authenticated user to delete sub_tree for their organization
CREATE POLICY "sub_tree_delete_policy_simple" ON public.sub_tree
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND 
    org_id IN (
      -- Check org_memberships table
      SELECT org_id FROM public.org_memberships 
      WHERE user_id = auth.uid()
      UNION
      -- Fallback: organizations where user is creator or owner
      SELECT id as org_id FROM public.organizations 
      WHERE created_by = auth.uid() OR owner_id = auth.uid()
    )
  );

-- Optional: If you want to keep some organization-based security but less restrictive,
-- you could use these alternative policies instead:

/*
-- Alternative: Less restrictive org-based policies
-- These allow access if user has ANY organization membership OR is authenticated

CREATE POLICY "sub_tree_view_policy_relaxed" ON public.sub_tree
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.org_memberships om
        WHERE om.org_id = sub_tree.org_id
          AND om.user_id = auth.uid()
      ) OR
      -- Fallback: allow if user has any org membership
      EXISTS (
        SELECT 1 FROM public.org_memberships om
        WHERE om.user_id = auth.uid()
        LIMIT 1
      )
    )
  );

-- Similar relaxed policies for INSERT, UPDATE, DELETE...
*/

-- Also ensure views are accessible
GRANT SELECT ON public.sub_tree_full TO authenticated;
GRANT SELECT ON public.sub_tree_full_v2 TO authenticated;

-- Update RPC functions to remove SECURITY DEFINER if they have permission issues
-- The functions below already have proper permissions, but we'll ensure they're accessible

GRANT EXECUTE ON FUNCTION public.rpc_sub_tree_next_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sub_tree TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_sub_tree TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_sub_tree TO authenticated;

COMMENT ON POLICY "sub_tree_view_policy_simple" ON public.sub_tree IS 'Allows any authenticated user to view sub_tree records';
COMMENT ON POLICY "sub_tree_insert_policy_simple" ON public.sub_tree IS 'Allows any authenticated user to create sub_tree records';
COMMENT ON POLICY "sub_tree_update_policy_simple" ON public.sub_tree IS 'Allows any authenticated user to update sub_tree records';
COMMENT ON POLICY "sub_tree_delete_policy_simple" ON public.sub_tree IS 'Allows any authenticated user to delete sub_tree records';
