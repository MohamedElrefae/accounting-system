-- 2025-10-26: Unified Organizations + Org Memberships schema, helpers, and RLS
SET search_path = public;

-- Helpers: safe generators
DO $$ BEGIN
  -- pgcrypto for gen_random_uuid
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;

-- 1) TABLE: organizations (idempotent)
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  name_ar text,
  description text,
  address text,
  phone text,
  email text,
  website text,
  tax_number text,
  registration_number text,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  parent_org_id uuid NULL REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL
);

-- Uniqueness and performance indexes
CREATE UNIQUE INDEX IF NOT EXISTS organizations_code_unique ON public.organizations (lower(code));
CREATE INDEX IF NOT EXISTS organizations_active_idx ON public.organizations (is_active) WHERE is_active = true;

-- Drop legacy status column if exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='organizations' AND column_name='status'
  ) THEN
    EXECUTE 'ALTER TABLE public.organizations DROP COLUMN IF EXISTS status';
  END IF;
END $$;

-- 2) TABLE: user_profiles (ensure minimal columns used by policies)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_profiles' AND column_name='is_super_admin'
  ) THEN
    EXECUTE 'ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false';
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 3) TABLE: org_memberships (idempotent; no role column)
CREATE TABLE IF NOT EXISTS public.org_memberships (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

-- Remove legacy role column if it exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='org_memberships' AND column_name='role'
  ) THEN
    EXECUTE 'ALTER TABLE public.org_memberships DROP COLUMN IF EXISTS role';
  END IF;
END $$;

-- Ensure at most one default org per user
CREATE UNIQUE INDEX IF NOT EXISTS org_memberships_one_default_per_user_idx
ON public.org_memberships (user_id) WHERE is_default = true;

-- 4) Security helpers
-- is_super_admin(): true if current user marked super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE((SELECT is_super_admin FROM public.user_profiles WHERE id = auth.uid()), false);
$$;

-- Minimal has_permission(): checks through roles->role_permissions when available
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_perm text)
RETURNS boolean
LANGUAGE plpgsql STABLE AS $$
DECLARE v_ok boolean := false; BEGIN
  IF p_user_id IS NULL OR p_perm IS NULL THEN RETURN false; END IF;
  -- Super admin shortcut
  IF EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = p_user_id AND COALESCE(up.is_super_admin,false)) THEN
    RETURN true;
  END IF;
  BEGIN
    SELECT true INTO v_ok
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id AND COALESCE(ur.is_active,true)
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user_id AND p.name = p_perm
    LIMIT 1;
  EXCEPTION WHEN undefined_table THEN v_ok := false; END;
  RETURN COALESCE(v_ok,false);
END $$;

-- fn_is_org_member() used by many functions
CREATE OR REPLACE FUNCTION public.fn_is_org_member(p_org_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_memberships m WHERE m.org_id = p_org_id AND m.user_id = p_user_id
  );
$$;

-- Back-compat wrapper ignoring role threshold
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid, p_min_role text DEFAULT 'viewer')
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.fn_is_org_member(p_org_id, auth.uid());
$$;

-- 5) Audit trigger for created_at/updated_at (no-op if helper missing)
CREATE OR REPLACE FUNCTION public.tg_set_audit_fields()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_now timestamptz := now(); BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_at IS NULL THEN NEW.created_at := v_now; END IF;
    IF NEW.updated_at IS NULL THEN NEW.updated_at := v_now; END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_at := v_now;
  END IF;
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='tg_orgs_audit' AND tgrelid='public.organizations'::regclass
  ) THEN
    EXECUTE 'CREATE TRIGGER tg_orgs_audit BEFORE INSERT OR UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.tg_set_audit_fields()';
  END IF;
END $$;

-- 6) RLS setup
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;

-- Policies: Organizations
DO $$ BEGIN
  -- SELECT: members of org or super admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organizations' AND policyname='orgs_select_members_or_super'
  ) THEN
    EXECUTE $$CREATE POLICY orgs_select_members_or_super ON public.organizations
      FOR SELECT USING (
        public.is_super_admin() OR EXISTS (
          SELECT 1 FROM public.org_memberships m WHERE m.org_id = organizations.id AND m.user_id = auth.uid()
        )
      )$$;
  END IF;
  -- INSERT/UPDATE/DELETE: super admin only by default
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organizations' AND policyname='orgs_modify_super_admin'
  ) THEN
    EXECUTE $$CREATE POLICY orgs_modify_super_admin ON public.organizations
      FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin())$$;
  END IF;
END $$;

-- Policies: Org Memberships
DO $$ BEGIN
  -- SELECT: members of org or super admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='org_memberships' AND policyname='orgm_select_members_or_super'
  ) THEN
    EXECUTE $$CREATE POLICY orgm_select_members_or_super ON public.org_memberships
      FOR SELECT USING (
        public.is_super_admin() OR EXISTS (
          SELECT 1 FROM public.org_memberships m2 WHERE m2.org_id = org_memberships.org_id AND m2.user_id = auth.uid()
        )
      )$$;
  END IF;
  -- INSERT/DELETE: allow super admin or users with users.manage or org.members.manage
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='org_memberships' AND policyname='orgm_modify_admins_or_perm'
  ) THEN
    EXECUTE $$CREATE POLICY orgm_modify_admins_or_perm ON public.org_memberships
      FOR INSERT TO authenticated WITH CHECK (
        public.is_super_admin() OR public.has_permission(auth.uid(), 'users.manage') OR public.has_permission(auth.uid(), 'org.members.manage')
      )$$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='org_memberships' AND policyname='orgm_delete_admins_or_perm'
  ) THEN
    EXECUTE $$CREATE POLICY orgm_delete_admins_or_perm ON public.org_memberships
      FOR DELETE TO authenticated USING (
        public.is_super_admin() OR public.has_permission(auth.uid(), 'users.manage') OR public.has_permission(auth.uid(), 'org.members.manage')
      )$$;
  END IF;
END $$;

-- 7) Verification views/queries (no changes applied here)
-- Use the verification block provided separately to confirm results.
