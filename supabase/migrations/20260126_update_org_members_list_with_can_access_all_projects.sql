-- Migration: Update org_members_list to include can_access_all_projects field
-- This allows the UI to display whether a user has access to all projects

-- Drop the existing function
DROP FUNCTION IF EXISTS public.org_members_list(uuid);

-- Recreate with the new field
CREATE OR REPLACE FUNCTION public.org_members_list(p_org_id uuid)
RETURNS TABLE (
  org_id uuid,
  user_id uuid,
  created_at timestamptz,
  can_access_all_projects boolean,
  email text,
  first_name text,
  last_name text,
  full_name_ar text,
  department text,
  job_title text,
  is_active boolean,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.org_id, 
    m.user_id, 
    m.created_at,
    COALESCE(m.can_access_all_projects, true) as can_access_all_projects,
    u.email, 
    u.first_name, 
    u.last_name, 
    u.full_name_ar, 
    u.department, 
    u.job_title, 
    u.is_active, 
    u.avatar_url
  FROM public.org_memberships m
  JOIN public.user_profiles u ON u.id = m.user_id
  WHERE m.org_id = p_org_id
    AND (public.is_super_admin() OR public.fn_is_org_member_norl(p_org_id, auth.uid()))
  ORDER BY m.created_at;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.org_members_list(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.org_members_list IS 'List all members of an organization with their profile information and project access settings';
