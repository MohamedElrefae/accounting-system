-- ============================================================================
-- ENTERPRISE PROJECT MEMBERSHIPS
-- User-Project Access Control System
-- ============================================================================
-- This migration adds project-level access control to complement org-level isolation
-- 
-- USAGE:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Existing users will have can_access_all_projects = true (no disruption)
-- 3. New users can be assigned to specific projects
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD FLAG TO ORG_MEMBERSHIPS FOR HYBRID APPROACH
-- ============================================================================
-- This allows gradual migration: existing users keep full access,
-- new users can be restricted to specific projects

ALTER TABLE public.org_memberships 
ADD COLUMN IF NOT EXISTS can_access_all_projects boolean DEFAULT true;

COMMENT ON COLUMN public.org_memberships.can_access_all_projects IS 
  'If true, user can access all projects in org. If false, user needs explicit project_memberships.';

-- ============================================================================
-- 2. CREATE PROJECT_MEMBERSHIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Role within project
  role varchar(50) DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  
  -- Granular permissions
  can_create boolean DEFAULT true,
  can_edit boolean DEFAULT true,
  can_delete boolean DEFAULT false,
  can_approve boolean DEFAULT false,
  
  -- Default project for user
  is_default boolean DEFAULT false,
  
  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  
  -- Unique constraint
  UNIQUE (project_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_memberships_user_id 
  ON public.project_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_project_memberships_project_id 
  ON public.project_memberships(project_id);
CREATE INDEX IF NOT EXISTS idx_project_memberships_org_id 
  ON public.project_memberships(org_id);

-- Only one default project per user per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_memberships_one_default_per_user_org
  ON public.project_memberships (user_id, org_id) WHERE is_default = true;

COMMENT ON TABLE public.project_memberships IS 
  'User-Project access assignments. Users need explicit membership to access project data when org_memberships.can_access_all_projects is false.';

-- ============================================================================
-- 3. RLS POLICIES FOR PROJECT_MEMBERSHIPS
-- ============================================================================

ALTER TABLE public.project_memberships ENABLE ROW LEVEL SECURITY;

-- Super admins can see all
CREATE POLICY "Super admins see all project memberships" 
  ON public.project_memberships FOR SELECT
  USING (public.is_super_admin());

-- Org admins can see memberships in their orgs
CREATE POLICY "Org members see project memberships in their orgs" 
  ON public.project_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships om
      WHERE om.org_id = project_memberships.org_id
        AND om.user_id = auth.uid()
    )
  );

-- Users can see their own memberships
CREATE POLICY "Users see own project memberships" 
  ON public.project_memberships FOR SELECT
  USING (user_id = auth.uid());

-- Super admins can manage all
CREATE POLICY "Super admins manage all project memberships" 
  ON public.project_memberships FOR ALL
  USING (public.is_super_admin());

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Check if user can access a specific project
CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Super admin can access all
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;
  
  -- Get project's org
  SELECT org_id INTO v_org_id FROM public.projects WHERE id = p_project_id;
  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has org membership with all-projects access
  IF EXISTS (
    SELECT 1 FROM public.org_memberships om
    WHERE om.org_id = v_org_id
      AND om.user_id = p_user_id
      AND COALESCE(om.can_access_all_projects, true) = true
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user has specific project membership
  RETURN EXISTS (
    SELECT 1 FROM public.project_memberships pm
    WHERE pm.project_id = p_project_id
      AND pm.user_id = p_user_id
  );
END;
$$;

-- Get all projects user can access in an org
CREATE OR REPLACE FUNCTION public.get_user_accessible_projects(p_org_id uuid)
RETURNS SETOF public.projects
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT p.* FROM public.projects p
  WHERE p.org_id = p_org_id
    AND p.status = 'active'
    AND (
      -- Super admin sees all
      public.is_super_admin()
      OR
      -- User has org membership with all-projects access
      EXISTS (
        SELECT 1 FROM public.org_memberships om
        WHERE om.org_id = p_org_id
          AND om.user_id = auth.uid()
          AND COALESCE(om.can_access_all_projects, true) = true
      )
      OR
      -- User has specific project membership
      EXISTS (
        SELECT 1 FROM public.project_memberships pm
        WHERE pm.project_id = p.id
          AND pm.user_id = auth.uid()
      )
    )
  ORDER BY p.code;
$$;

-- ============================================================================
-- 5. ADMIN FUNCTIONS
-- ============================================================================

-- Assign user to project
CREATE OR REPLACE FUNCTION public.assign_user_to_project(
  p_user_id uuid,
  p_project_id uuid,
  p_role varchar DEFAULT 'member',
  p_can_create boolean DEFAULT true,
  p_can_edit boolean DEFAULT true,
  p_can_delete boolean DEFAULT false,
  p_can_approve boolean DEFAULT false
)
RETURNS public.project_memberships
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_result public.project_memberships;
BEGIN
  -- Only super admin or org admin can assign
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admin can assign users to projects';
  END IF;
  
  -- Get project's org
  SELECT org_id INTO v_org_id FROM public.projects WHERE id = p_project_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;
  
  -- Verify user is member of org
  IF NOT EXISTS (
    SELECT 1 FROM public.org_memberships 
    WHERE user_id = p_user_id AND org_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'User must be member of organization first';
  END IF;
  
  -- Insert or update membership
  INSERT INTO public.project_memberships (
    project_id, user_id, org_id, role, 
    can_create, can_edit, can_delete, can_approve, 
    created_by
  )
  VALUES (
    p_project_id, p_user_id, v_org_id, p_role,
    p_can_create, p_can_edit, p_can_delete, p_can_approve,
    auth.uid()
  )
  ON CONFLICT (project_id, user_id) DO UPDATE SET 
    role = EXCLUDED.role,
    can_create = EXCLUDED.can_create,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete,
    can_approve = EXCLUDED.can_approve,
    updated_at = now()
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Remove user from project
CREATE OR REPLACE FUNCTION public.remove_user_from_project(
  p_user_id uuid,
  p_project_id uuid
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only super admin can remove
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admin can remove users from projects';
  END IF;
  
  DELETE FROM public.project_memberships
  WHERE user_id = p_user_id AND project_id = p_project_id;
  
  RETURN FOUND;
END;
$$;

-- Set user's project access mode (all projects vs specific)
CREATE OR REPLACE FUNCTION public.set_user_project_access_mode(
  p_user_id uuid,
  p_org_id uuid,
  p_can_access_all boolean
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only super admin can change
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admin can change project access mode';
  END IF;
  
  UPDATE public.org_memberships
  SET can_access_all_projects = p_can_access_all
  WHERE user_id = p_user_id AND org_id = p_org_id;
  
  RETURN FOUND;
END;
$$;

-- Get user's project memberships
CREATE OR REPLACE FUNCTION public.get_user_project_memberships(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  project_id uuid,
  project_code varchar,
  project_name varchar,
  org_id uuid,
  org_code varchar,
  org_name varchar,
  role varchar,
  can_create boolean,
  can_edit boolean,
  can_delete boolean,
  can_approve boolean,
  is_default boolean
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT 
    pm.project_id,
    p.code as project_code,
    p.name as project_name,
    pm.org_id,
    o.code as org_code,
    o.name as org_name,
    pm.role,
    pm.can_create,
    pm.can_edit,
    pm.can_delete,
    pm.can_approve,
    pm.is_default
  FROM public.project_memberships pm
  JOIN public.projects p ON p.id = pm.project_id
  JOIN public.organizations o ON o.id = pm.org_id
  WHERE pm.user_id = p_user_id
  ORDER BY o.code, p.code;
$$;

-- ============================================================================
-- 6. VERIFICATION QUERIES
-- ============================================================================

-- Check current user's org memberships and project access mode
-- SELECT 
--   om.org_id,
--   o.code as org_code,
--   o.name as org_name,
--   om.can_access_all_projects,
--   om.is_default
-- FROM public.org_memberships om
-- JOIN public.organizations o ON o.id = om.org_id
-- WHERE om.user_id = auth.uid();

-- Check current user's project memberships
-- SELECT * FROM public.get_user_project_memberships();

-- Check if user can access a specific project
-- SELECT public.can_access_project('PROJECT_UUID_HERE');

-- Get accessible projects for current user in an org
-- SELECT * FROM public.get_user_accessible_projects('ORG_UUID_HERE');

COMMIT;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.get_user_project_memberships(uuid);
-- DROP FUNCTION IF EXISTS public.set_user_project_access_mode(uuid, uuid, boolean);
-- DROP FUNCTION IF EXISTS public.remove_user_from_project(uuid, uuid);
-- DROP FUNCTION IF EXISTS public.assign_user_to_project(uuid, uuid, varchar, boolean, boolean, boolean, boolean);
-- DROP FUNCTION IF EXISTS public.get_user_accessible_projects(uuid);
-- DROP FUNCTION IF EXISTS public.can_access_project(uuid, uuid);
-- DROP TABLE IF EXISTS public.project_memberships;
-- ALTER TABLE public.org_memberships DROP COLUMN IF EXISTS can_access_all_projects;
