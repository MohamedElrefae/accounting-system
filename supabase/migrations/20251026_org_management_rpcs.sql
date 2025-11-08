-- 2025-10-26: Organization management RPCs to decouple UI from table RLS and ensure stable CRUD
SET search_path = public;

-- 0) Safety helpers grants (ensure callable from policies/RPC)
DO $$ BEGIN
  BEGIN GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO anon, authenticated; EXCEPTION WHEN undefined_function THEN NULL; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.fn_is_org_member_norl(uuid, uuid) TO anon, authenticated; EXCEPTION WHEN undefined_function THEN NULL; END;
END $$;

-- 1) List organizations available to current user
CREATE OR REPLACE FUNCTION public.org_list(p_only_active boolean DEFAULT true)
RETURNS SETOF public.organizations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.*
  FROM public.organizations o
  WHERE (NOT p_only_active OR COALESCE(o.is_active, true))
    AND (public.is_super_admin() OR public.fn_is_org_member_norl(o.id, auth.uid()))
  ORDER BY o.code;
$$;
GRANT EXECUTE ON FUNCTION public.org_list(boolean) TO anon, authenticated;

-- 2) Create organization (requires super admin or org.manage)
CREATE OR REPLACE FUNCTION public.org_create(p jsonb)
RETURNS public.organizations
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org public.organizations;
BEGIN
  IF NOT (public.is_super_admin() OR public.has_permission(auth.uid(), 'org.manage')) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.organizations (
    code, name, name_ar, description, address, phone, email, website,
    tax_number, registration_number, logo_url, is_active, parent_org_id
  )
  SELECT
    p->>'code', p->>'name', p->>'name_ar', p->>'description', p->>'address', p->>'phone', p->>'email', p->>'website',
    p->>'tax_number', p->>'registration_number', p->>'logo_url', COALESCE((p->>'is_active')::boolean, true), (p->>'parent_org_id')::uuid
  RETURNING * INTO v_org;

  RETURN v_org;
END; $$;
GRANT EXECUTE ON FUNCTION public.org_create(jsonb) TO authenticated;

-- 3) Update organization
CREATE OR REPLACE FUNCTION public.org_update(p_id uuid, p jsonb)
RETURNS public.organizations
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org public.organizations; BEGIN
  IF NOT (public.is_super_admin() OR public.has_permission(auth.uid(), 'org.manage')) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.organizations o SET
    code = COALESCE(p->>'code', o.code),
    name = COALESCE(p->>'name', o.name),
    name_ar = COALESCE(p->>'name_ar', o.name_ar),
    description = COALESCE(p->>'description', o.description),
    address = COALESCE(p->>'address', o.address),
    phone = COALESCE(p->>'phone', o.phone),
    email = COALESCE(p->>'email', o.email),
    website = COALESCE(p->>'website', o.website),
    tax_number = COALESCE(p->>'tax_number', o.tax_number),
    registration_number = COALESCE(p->>'registration_number', o.registration_number),
    logo_url = COALESCE(p->>'logo_url', o.logo_url),
    is_active = COALESCE(NULLIF(p->>'is_active','')::boolean, o.is_active),
    parent_org_id = COALESCE(NULLIF(p->>'parent_org_id','')::uuid, o.parent_org_id),
    updated_at = now()
  WHERE o.id = p_id
  RETURNING * INTO v_org;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_org;
END; $$;
GRANT EXECUTE ON FUNCTION public.org_update(uuid, jsonb) TO authenticated;

-- 4) Delete organization
CREATE OR REPLACE FUNCTION public.org_delete(p_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin() OR public.has_permission(auth.uid(), 'org.manage')) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.organizations WHERE id = p_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.org_delete(uuid) TO authenticated;

-- 5) List org members with user profile info (requires membership on org or super admin)
CREATE OR REPLACE FUNCTION public.org_members_list(p_org_id uuid)
RETURNS TABLE (
  org_id uuid,
  user_id uuid,
  created_at timestamptz,
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
  SELECT m.org_id, m.user_id, m.created_at,
         u.email, u.first_name, u.last_name, u.full_name_ar, u.department, u.job_title, u.is_active, u.avatar_url
  FROM public.org_memberships m
  JOIN public.user_profiles u ON u.id = m.user_id
  WHERE m.org_id = p_org_id
    AND (public.is_super_admin() OR public.fn_is_org_member_norl(p_org_id, auth.uid()))
  ORDER BY m.created_at;
$$;
GRANT EXECUTE ON FUNCTION public.org_members_list(uuid) TO authenticated;

-- 6) Add org member
CREATE OR REPLACE FUNCTION public.org_member_add(p_org_id uuid, p_user_id uuid, p_is_default boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin() OR public.has_permission(auth.uid(), 'users.manage') OR public.has_permission(auth.uid(), 'org.members.manage')) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.org_memberships (org_id, user_id, is_default)
  VALUES (p_org_id, p_user_id, COALESCE(p_is_default,false))
  ON CONFLICT (org_id, user_id) DO NOTHING;
END; $$;
GRANT EXECUTE ON FUNCTION public.org_member_add(uuid, uuid, boolean) TO authenticated;

-- 7) Remove org member
CREATE OR REPLACE FUNCTION public.org_member_remove(p_org_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin() OR public.has_permission(auth.uid(), 'users.manage') OR public.has_permission(auth.uid(), 'org.members.manage')) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.org_memberships WHERE org_id = p_org_id AND user_id = p_user_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.org_member_remove(uuid, uuid) TO authenticated;

-- 8) Search active users not in org
CREATE OR REPLACE FUNCTION public.org_users_not_in(p_org_id uuid, p_query text DEFAULT '', p_limit int DEFAULT 20)
RETURNS SETOF public.user_profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.*
  FROM public.user_profiles u
  WHERE COALESCE(u.is_active, true)
    AND (p_query = '' OR u.email ILIKE '%' || p_query || '%')
    AND NOT EXISTS (
      SELECT 1 FROM public.org_memberships m WHERE m.org_id = p_org_id AND m.user_id = u.id
    )
  ORDER BY u.email
  LIMIT GREATEST(p_limit, 1);
$$;
GRANT EXECUTE ON FUNCTION public.org_users_not_in(uuid, text, int) TO authenticated;
