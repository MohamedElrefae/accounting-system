-- 2025-12-20_presence_activity_teams.sql
SET search_path = public;

-- Ensure UUID generation is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1) PERMISSIONS + ROLES (HR + Team Leader)
-- ============================================

DO $$
DECLARE
  v_perm_view_org_id integer;
  v_perm_view_team_id integer;
  v_perm_view_all_id integer;
  v_role_hr_id integer;
  v_role_team_leader_id integer;
  v_role_id integer;
BEGIN
  -- Create permissions (idempotent by name)
  IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'presence.view.org') THEN
    INSERT INTO public.permissions (name, name_ar, resource, action, description, description_ar, category)
    VALUES
      ('presence.view.org', 'عرض الحضور (المنظمة)', 'presence', 'view', 'View online/active users within the organization', 'عرض المستخدمين المتصلين/النشطين داخل المنظمة', 'security');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'presence.view.team') THEN
    INSERT INTO public.permissions (name, name_ar, resource, action, description, description_ar, category)
    VALUES
      ('presence.view.team', 'عرض الحضور (الفريق)', 'presence', 'view', 'View online/active users within the team', 'عرض المستخدمين المتصلين/النشطين داخل الفريق', 'security');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'presence.view.all') THEN
    INSERT INTO public.permissions (name, name_ar, resource, action, description, description_ar, category)
    VALUES
      ('presence.view.all', 'عرض الحضور (الكل)', 'presence', 'view', 'View online/active users across all organizations (super admin)', 'عرض المستخدمين المتصلين/النشطين عبر كل المنظمات (مدير عام)', 'security');
  END IF;

  SELECT id INTO v_perm_view_org_id FROM public.permissions WHERE name = 'presence.view.org' LIMIT 1;
  SELECT id INTO v_perm_view_team_id FROM public.permissions WHERE name = 'presence.view.team' LIMIT 1;
  SELECT id INTO v_perm_view_all_id FROM public.permissions WHERE name = 'presence.view.all' LIMIT 1;

  -- Create HR role (do NOT rely on unique constraint; your DB already has duplicate role names)
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE lower(name) = 'hr') THEN
    INSERT INTO public.roles (name, name_ar, description, description_ar, is_system, is_system_role)
    VALUES ('hr', 'الموارد البشرية', 'Human Resources', 'الموارد البشرية', false, false);
  END IF;

  -- Create Team Leader role
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE lower(name) = 'team_leader') THEN
    INSERT INTO public.roles (name, name_ar, description, description_ar, is_system, is_system_role)
    VALUES ('team_leader', 'قائد فريق', 'Team Leader', 'قائد فريق', false, false);
  END IF;

  SELECT id INTO v_role_hr_id FROM public.roles WHERE lower(name) = 'hr' ORDER BY id ASC LIMIT 1;
  SELECT id INTO v_role_team_leader_id FROM public.roles WHERE lower(name) = 'team_leader' ORDER BY id ASC LIMIT 1;

  -- Assign permissions to HR and Team Leader
  IF v_role_hr_id IS NOT NULL AND v_perm_view_org_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.role_permissions rp
      WHERE rp.role_id = v_role_hr_id AND rp.permission_id = v_perm_view_org_id
    ) THEN
      INSERT INTO public.role_permissions(role_id, permission_id)
      VALUES (v_role_hr_id, v_perm_view_org_id);
    END IF;
  END IF;

  -- Also grant HR the team permission so UI can be gated on one permission
  IF v_role_hr_id IS NOT NULL AND v_perm_view_team_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.role_permissions rp
      WHERE rp.role_id = v_role_hr_id AND rp.permission_id = v_perm_view_team_id
    ) THEN
      INSERT INTO public.role_permissions(role_id, permission_id)
      VALUES (v_role_hr_id, v_perm_view_team_id);
    END IF;
  END IF;

  IF v_role_team_leader_id IS NOT NULL AND v_perm_view_team_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.role_permissions rp
      WHERE rp.role_id = v_role_team_leader_id AND rp.permission_id = v_perm_view_team_id
    ) THEN
      INSERT INTO public.role_permissions(role_id, permission_id)
      VALUES (v_role_team_leader_id, v_perm_view_team_id);
    END IF;
  END IF;

  -- Give Super Admin roles the global permission (best-effort; supports both naming variants)
  FOR v_role_id IN
    SELECT id FROM public.roles WHERE lower(name) IN ('super admin', 'super_admin')
  LOOP
    IF v_perm_view_all_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.role_permissions rp
        WHERE rp.role_id = v_role_id AND rp.permission_id = v_perm_view_all_id
      ) THEN
        INSERT INTO public.role_permissions(role_id, permission_id)
        VALUES (v_role_id, v_perm_view_all_id);
      END IF;
    END IF;

    -- Also grant team permission for consistent UI gating
    IF v_perm_view_team_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.role_permissions rp
        WHERE rp.role_id = v_role_id AND rp.permission_id = v_perm_view_team_id
      ) THEN
        INSERT INTO public.role_permissions(role_id, permission_id)
        VALUES (v_role_id, v_perm_view_team_id);
      END IF;
    END IF;
  END LOOP;

  -- Give Admin/Owner org-wide permission (best-effort; can be adjusted later)
  FOR v_role_id IN
    SELECT id FROM public.roles WHERE lower(name) IN ('owner', 'admin')
  LOOP
    IF v_perm_view_org_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.role_permissions rp
        WHERE rp.role_id = v_role_id AND rp.permission_id = v_perm_view_org_id
      ) THEN
        INSERT INTO public.role_permissions(role_id, permission_id)
        VALUES (v_role_id, v_perm_view_org_id);
      END IF;
    END IF;

    -- Also grant team permission for consistent UI gating
    IF v_perm_view_team_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.role_permissions rp
        WHERE rp.role_id = v_role_id AND rp.permission_id = v_perm_view_team_id
      ) THEN
        INSERT INTO public.role_permissions(role_id, permission_id)
        VALUES (v_role_id, v_perm_view_team_id);
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- ============================================
-- 2) TEAMS TABLES (for Team Leader scope)
-- ============================================

CREATE TABLE IF NOT EXISTS public.org_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  name_ar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_org_teams_org_id ON public.org_teams(org_id);

CREATE TABLE IF NOT EXISTS public.org_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  team_id uuid NOT NULL REFERENCES public.org_teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_leader boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_team_members_team_user ON public.org_team_members(team_id, user_id);
CREATE INDEX IF NOT EXISTS idx_org_team_members_org_id ON public.org_team_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_team_members_user_id ON public.org_team_members(user_id);

-- Enforce a single leader per team
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_team_members_one_leader_per_team
ON public.org_team_members(team_id)
WHERE is_leader = true;

-- Ensure org_id matches team org_id
CREATE OR REPLACE FUNCTION public.tg_org_team_members_enforce_org()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_team_org uuid;
BEGIN
  SELECT org_id INTO v_team_org FROM public.org_teams WHERE id = NEW.team_id;
  IF v_team_org IS NULL THEN
    RAISE EXCEPTION 'Invalid team_id';
  END IF;
  IF NEW.org_id IS DISTINCT FROM v_team_org THEN
    RAISE EXCEPTION 'org_id mismatch for team membership';
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_org_team_members_enforce_org ON public.org_team_members;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE TRIGGER trg_org_team_members_enforce_org
BEFORE INSERT OR UPDATE ON public.org_team_members
FOR EACH ROW EXECUTE FUNCTION public.tg_org_team_members_enforce_org();

-- ============================================
-- 3) PRESENCE HEARTBEATS (safe table, no tokens)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_presence_heartbeats (
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_presence_heartbeats_last_seen ON public.user_presence_heartbeats(last_seen_at);

CREATE OR REPLACE FUNCTION public.tg_user_presence_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_user_presence_touch_updated_at ON public.user_presence_heartbeats;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE TRIGGER trg_user_presence_touch_updated_at
BEFORE UPDATE ON public.user_presence_heartbeats
FOR EACH ROW EXECUTE FUNCTION public.tg_user_presence_touch_updated_at();

-- ============================================
-- 4) RLS POLICIES (Teams + Presence)
-- ============================================

-- Teams
ALTER TABLE IF EXISTS public.org_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.org_team_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS org_teams_select ON public.org_teams;
  DROP POLICY IF EXISTS org_teams_write ON public.org_teams;
  DROP POLICY IF EXISTS org_teams_write_update ON public.org_teams;
  DROP POLICY IF EXISTS org_teams_write_delete ON public.org_teams;
  DROP POLICY IF EXISTS org_team_members_select ON public.org_team_members;
  DROP POLICY IF EXISTS org_team_members_write_ins ON public.org_team_members;
  DROP POLICY IF EXISTS org_team_members_write_upd ON public.org_team_members;
  DROP POLICY IF EXISTS org_team_members_write_del ON public.org_team_members;

  -- SELECT teams: users who can view org/team presence
  CREATE POLICY org_teams_select ON public.org_teams
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
        AND EXISTS (
          SELECT 1
          FROM public.org_team_members m
          WHERE m.org_id = org_teams.org_id
            AND m.team_id = org_teams.id
            AND m.user_id = auth.uid()
        )
      )
    );

  -- WRITE teams: org admins (manage members) or super admin
  CREATE POLICY org_teams_write ON public.org_teams
    FOR INSERT TO authenticated
    WITH CHECK (
      public.is_super_admin()
      OR (
        public.fn_is_org_member(org_id)
        AND public.has_permission(auth.uid(), 'organizations.manage_members')
      )
    );

  CREATE POLICY org_teams_write_update ON public.org_teams
    FOR UPDATE TO authenticated
    USING (
      public.is_super_admin()
      OR (
        public.fn_is_org_member(org_id)
        AND public.has_permission(auth.uid(), 'organizations.manage_members')
      )
    )
    WITH CHECK (
      public.is_super_admin()
      OR (
        public.fn_is_org_member(org_id)
        AND public.has_permission(auth.uid(), 'organizations.manage_members')
      )
    );

  CREATE POLICY org_teams_write_delete ON public.org_teams
    FOR DELETE TO authenticated
    USING (
      public.is_super_admin()
      OR (
        public.fn_is_org_member(org_id)
        AND public.has_permission(auth.uid(), 'organizations.manage_members')
      )
    );

  -- SELECT team membership:
  -- - Super admin: all
  -- - Org-wide viewers: org-wide
  -- - Team viewers: only if they are a leader of the team
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
        AND EXISTS (
          SELECT 1
          FROM public.org_team_members leader
          WHERE leader.org_id = org_team_members.org_id
            AND leader.team_id = org_team_members.team_id
            AND leader.user_id = auth.uid()
            AND leader.is_leader = true
        )
      )
    );

  -- WRITE team membership: org admins (manage members) or super admin
  CREATE POLICY org_team_members_write_ins ON public.org_team_members
    FOR INSERT TO authenticated
    WITH CHECK (
      public.is_super_admin()
      OR (
        public.fn_is_org_member(org_id)
        AND public.has_permission(auth.uid(), 'organizations.manage_members')
      )
    );

  CREATE POLICY org_team_members_write_upd ON public.org_team_members
    FOR UPDATE TO authenticated
    USING (
      public.is_super_admin()
      OR (
        public.fn_is_org_member(org_id)
        AND public.has_permission(auth.uid(), 'organizations.manage_members')
      )
    )
    WITH CHECK (
      public.is_super_admin()
      OR (
        public.fn_is_org_member(org_id)
        AND public.has_permission(auth.uid(), 'organizations.manage_members')
      )
    );

  CREATE POLICY org_team_members_write_del ON public.org_team_members
    FOR DELETE TO authenticated
    USING (
      public.is_super_admin()
      OR (
        public.fn_is_org_member(org_id)
        AND public.has_permission(auth.uid(), 'organizations.manage_members')
      )
    );
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

-- RPC: set team leader (atomic)
CREATE OR REPLACE FUNCTION public.rpc_set_team_leader(
  p_org_id uuid,
  p_team_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  IF p_org_id IS NULL OR p_team_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid arguments' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.is_super_admin()
    OR (
      public.fn_is_org_member(p_org_id)
      AND public.has_permission(v_uid, 'organizations.manage_members')
    )
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.org_teams t WHERE t.id = p_team_id AND t.org_id = p_org_id) THEN
    RAISE EXCEPTION 'team not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.org_team_members m WHERE m.org_id = p_org_id AND m.team_id = p_team_id AND m.user_id = p_user_id) THEN
    RAISE EXCEPTION 'user not in team' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.org_team_members
  SET is_leader = false
  WHERE org_id = p_org_id AND team_id = p_team_id AND is_leader = true;

  UPDATE public.org_team_members
  SET is_leader = true
  WHERE org_id = p_org_id AND team_id = p_team_id AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_set_team_leader(uuid, uuid, uuid) TO authenticated, service_role;

-- Presence heartbeats
ALTER TABLE IF EXISTS public.user_presence_heartbeats ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS user_presence_select ON public.user_presence_heartbeats;
  DROP POLICY IF EXISTS user_presence_upsert_self ON public.user_presence_heartbeats;
  DROP POLICY IF EXISTS user_presence_update_self ON public.user_presence_heartbeats;
  DROP POLICY IF EXISTS user_presence_delete_admin ON public.user_presence_heartbeats;

  -- SELECT: super admin OR org-wide viewers OR team leaders (team-only) OR self
  CREATE POLICY user_presence_select ON public.user_presence_heartbeats
    FOR SELECT TO authenticated
    USING (
      public.is_super_admin()
      OR user_id = auth.uid()
      OR (
        public.fn_is_org_member(org_id)
        AND public.has_permission(auth.uid(), 'presence.view.org')
      )
      OR (
        public.fn_is_org_member(org_id)
        AND public.has_permission(auth.uid(), 'presence.view.team')
        AND EXISTS (
          SELECT 1
          FROM public.org_team_members leader
          JOIN public.org_team_members member
            ON member.team_id = leader.team_id
          WHERE leader.user_id = auth.uid()
            AND leader.is_leader = true
            AND leader.org_id = user_presence_heartbeats.org_id
            AND member.user_id = user_presence_heartbeats.user_id
        )
      )
    );

  -- INSERT/UPDATE: only self, must be org member
  CREATE POLICY user_presence_upsert_self ON public.user_presence_heartbeats
    FOR INSERT TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      AND public.fn_is_org_member(org_id)
    );

  CREATE POLICY user_presence_update_self ON public.user_presence_heartbeats
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid() AND public.fn_is_org_member(org_id));

  -- DELETE: super admin or org admin (manage members)
  CREATE POLICY user_presence_delete_admin ON public.user_presence_heartbeats
    FOR DELETE TO authenticated
    USING (
      public.is_super_admin()
      OR (
        public.fn_is_org_member(org_id)
        AND public.has_permission(auth.uid(), 'organizations.manage_members')
      )
    );
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- 5) RPC: HEARTBEAT + PRESENCE LIST (safe projection)
-- ============================================

-- Heartbeat: updates online now + org membership last_active_at
CREATE OR REPLACE FUNCTION public.rpc_presence_heartbeat(
  p_org_id uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  IF p_org_id IS NULL THEN
    p_org_id := public.get_user_default_organization();
  END IF;

  IF NOT public.is_super_admin() AND NOT public.fn_is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_presence_heartbeats(org_id, user_id, last_seen_at, metadata)
  VALUES (p_org_id, v_uid, now(), p_metadata)
  ON CONFLICT (org_id, user_id)
  DO UPDATE SET last_seen_at = excluded.last_seen_at,
                metadata = excluded.metadata,
                updated_at = now();

  UPDATE public.org_memberships
  SET last_active_at = now()
  WHERE org_id = p_org_id AND user_id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_presence_heartbeat(uuid, jsonb) TO authenticated, service_role;

-- Presence list: returns safe columns only
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

-- NOTE: rpc_list_user_presence enforces its own permission logic. RLS on source tables still applies.

