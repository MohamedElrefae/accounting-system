-- 2025-12-21_fix_rpc_list_user_presence_return_types.sql
-- Fix: rpc_list_user_presence was failing with 42804 when user_profiles columns are varchar(255)
-- but the function returns TABLE columns typed as text.

SET search_path = public;

CREATE OR REPLACE FUNCTION public.rpc_list_user_presence(
  p_org_id uuid DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_online_within_seconds integer DEFAULT 120,
  p_active_within_seconds integer DEFAULT 900
)
RETURNS TABLE (
  org_id uuid,
  user_id uuid,
  email text,
  full_name text,
  job_title text,
  department text,
  last_seen_at timestamptz,
  last_active_at timestamptz,
  is_online boolean
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_effective_org uuid;
  v_can_all boolean;
  v_can_org boolean;
  v_can_team boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  v_can_all := public.is_super_admin() OR public.has_permission(v_uid, 'presence.view.all');
  v_can_org := public.has_permission(v_uid, 'presence.view.org');
  v_can_team := public.has_permission(v_uid, 'presence.view.team');

  IF p_org_id IS NULL THEN
    v_effective_org := public.get_user_default_organization();
  ELSE
    v_effective_org := p_org_id;
  END IF;

  -- Non-superadmin must be a member of the org they're requesting
  IF NOT v_can_all AND NOT public.fn_is_org_member(v_effective_org) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      m.org_id,
      m.user_id,
      p.email::text AS email,
      COALESCE(NULLIF(trim(p.first_name || ' ' || p.last_name), ''), p.email)::text AS full_name,
      p.job_title::text AS job_title,
      p.department::text AS department,
      h.last_seen_at,
      m.last_active_at,
      (h.last_seen_at >= now() - make_interval(secs => p_online_within_seconds)) AS is_online
    FROM public.org_memberships m
    JOIN public.user_profiles p ON p.id = m.user_id
    LEFT JOIN public.user_presence_heartbeats h
      ON h.org_id = m.org_id AND h.user_id = m.user_id
    WHERE (v_can_all OR m.org_id = v_effective_org)
      AND (m.last_active_at IS NULL OR m.last_active_at >= now() - make_interval(secs => p_active_within_seconds))
  )
  SELECT *
  FROM base
  WHERE (
    v_can_all
    OR v_can_org
    OR (
      v_can_team
      AND EXISTS (
        SELECT 1
        FROM public.org_team_members leader
        JOIN public.org_team_members member
          ON member.team_id = leader.team_id
        WHERE leader.user_id = v_uid
          AND leader.is_leader = true
          AND leader.org_id = base.org_id
          AND member.user_id = base.user_id
          AND (p_team_id IS NULL OR leader.team_id = p_team_id)
      )
    )
  )
  ORDER BY is_online DESC, last_seen_at DESC NULLS LAST, full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_list_user_presence(uuid, uuid, integer, integer) TO authenticated, service_role;
