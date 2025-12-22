-- 2025-12-21_fix_org_team_members_rls_recursion.sql
SET search_path = public;

-- Helper to avoid RLS recursion in policies referencing org_team_members from org_team_members
CREATE OR REPLACE FUNCTION public.fn_is_team_leader_for_member(
  p_org_id uuid,
  p_leader_user_id uuid,
  p_member_user_id uuid,
  p_team_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_team_members leader
    JOIN public.org_team_members member
      ON member.team_id = leader.team_id
     AND member.org_id = leader.org_id
    WHERE leader.org_id = p_org_id
      AND leader.user_id = p_leader_user_id
      AND leader.is_leader = true
      AND member.user_id = p_member_user_id
      AND (p_team_id IS NULL OR leader.team_id = p_team_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_is_team_leader_for_member(uuid, uuid, uuid, uuid) TO authenticated, service_role;

-- Recreate the org_team_members SELECT policy without self-referential queries
DO $$
BEGIN
  DROP POLICY IF EXISTS org_team_members_select ON public.org_team_members;

  CREATE POLICY org_team_members_select ON public.org_team_members
    FOR SELECT TO authenticated
    USING (
      public.is_super_admin()
      OR (
        public.fn_is_org_member(org_id)
        AND public.has_permission(auth.uid(), 'presence.view.org')
      )
      OR (
        public.fn_is_org_member(org_id)
        AND public.has_permission(auth.uid(), 'presence.view.team')
        AND public.fn_is_team_leader_for_member(org_id, auth.uid(), user_id, team_id)
      )
    );
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;
