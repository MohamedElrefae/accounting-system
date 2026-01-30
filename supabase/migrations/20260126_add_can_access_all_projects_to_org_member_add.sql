-- Migration: Add can_access_all_projects parameter to org_member_add function
-- This allows setting whether a user can access all projects in an organization when adding them

-- Drop the existing function
DROP FUNCTION IF EXISTS public.org_member_add(uuid, uuid, boolean);

-- Recreate with the new parameter
CREATE OR REPLACE FUNCTION public.org_member_add(
  p_org_id uuid, 
  p_user_id uuid, 
  p_is_default boolean DEFAULT false,
  p_can_access_all_projects boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check permissions
  IF NOT (
    public.is_super_admin() OR 
    public.has_permission(auth.uid(), 'users.manage') OR 
    public.has_permission(auth.uid(), 'org.members.manage')
  ) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  
  -- Insert or update org membership with can_access_all_projects
  INSERT INTO public.org_memberships (
    org_id, 
    user_id, 
    is_default, 
    can_access_all_projects
  )
  VALUES (
    p_org_id, 
    p_user_id, 
    COALESCE(p_is_default, false),
    COALESCE(p_can_access_all_projects, true)
  )
  ON CONFLICT (org_id, user_id) 
  DO UPDATE SET
    is_default = COALESCE(p_is_default, org_memberships.is_default),
    can_access_all_projects = COALESCE(p_can_access_all_projects, org_memberships.can_access_all_projects);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.org_member_add(uuid, uuid, boolean, boolean) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.org_member_add IS 'Add or update a user as a member of an organization with project access control';
