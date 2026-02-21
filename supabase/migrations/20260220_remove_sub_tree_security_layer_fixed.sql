-- 2026-02-20: Remove additional security layer from sub_tree services
-- This migration simplifies RLS policies to allow broader access for authenticated users
-- while preserving multitenant isolation via org_id

-- Drop existing restrictive RLS policies
DROP POLICY IF EXISTS "sub_tree_view_policy" ON public.sub_tree;
DROP POLICY IF EXISTS "sub_tree_insert_policy" ON public.sub_tree;
DROP POLICY IF EXISTS "sub_tree_update_policy" ON public.sub_tree;
DROP POLICY IF EXISTS "sub_tree_delete_policy" ON public.sub_tree;

-- Create simplified RLS policies - allow any authenticated user to access sub_tree for their org
-- Uses only existing tables: org_memberships and organizations

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
      -- Fallback: organizations where user is creator
      SELECT id as org_id FROM public.organizations 
      WHERE created_by = auth.uid()
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
      -- Fallback: organizations where user is creator
      SELECT id as org_id FROM public.organizations 
      WHERE created_by = auth.uid()
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
      -- Fallback: organizations where user is creator
      SELECT id as org_id FROM public.organizations 
      WHERE created_by = auth.uid()
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
      -- Fallback: organizations where user is creator
      SELECT id as org_id FROM public.organizations 
      WHERE created_by = auth.uid()
    )
  );

-- Also ensure views are accessible
GRANT SELECT ON public.sub_tree_full TO authenticated;
GRANT SELECT ON public.sub_tree_full_v2 TO authenticated;

-- Update RPC functions permissions
GRANT EXECUTE ON FUNCTION public.rpc_sub_tree_next_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sub_tree TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_sub_tree TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_sub_tree TO authenticated;

-- Add comments for documentation
COMMENT ON POLICY "sub_tree_view_policy_simple" ON public.sub_tree IS 'Allows authenticated users to view sub_tree records for their organizations';
COMMENT ON POLICY "sub_tree_insert_policy_simple" ON public.sub_tree IS 'Allows authenticated users to create sub_tree records for their organizations';
COMMENT ON POLICY "sub_tree_update_policy_simple" ON public.sub_tree IS 'Allows authenticated users to update sub_tree records for their organizations';
COMMENT ON POLICY "sub_tree_delete_policy_simple" ON public.sub_tree IS 'Allows authenticated users to delete sub_tree records for their organizations';
