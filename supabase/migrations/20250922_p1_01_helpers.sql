-- Phase 1 / 01 - Security helpers and audit trigger foundation
SET search_path = public;

-- fn_current_user_id
CREATE OR REPLACE FUNCTION public.fn_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid();
$$;

-- fn_is_org_member
CREATE OR REPLACE FUNCTION public.fn_is_org_member(p_org_id uuid, p_user_id uuid DEFAULT public.fn_current_user_id())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_org_id IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.org_memberships om WHERE om.org_id = p_org_id AND om.user_id = p_user_id
  );
END;
$$;

-- fn_can_manage_fiscal
CREATE OR REPLACE FUNCTION public.fn_can_manage_fiscal(p_org_id uuid, p_user_id uuid DEFAULT public.fn_current_user_id())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super boolean := FALSE;
  v_has_perm boolean := FALSE;
  v_is_member boolean := FALSE;
BEGIN
  IF p_org_id IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  BEGIN SELECT public.is_super_admin() INTO v_is_super; EXCEPTION WHEN undefined_function THEN v_is_super := FALSE; END;
  BEGIN
    SELECT COALESCE(public.has_permission(p_user_id, 'transactions.manage'), FALSE)
         OR COALESCE(public.has_permission(p_user_id, 'fiscal.manage'), FALSE)
    INTO v_has_perm;
  EXCEPTION WHEN undefined_function THEN
    BEGIN
      SELECT COALESCE(public.check_user_permission(p_user_id, 'transactions.manage'), FALSE)
           OR COALESCE(public.check_user_permission(p_user_id, 'fiscal.manage'), FALSE)
      INTO v_has_perm;
    EXCEPTION WHEN undefined_function THEN v_has_perm := FALSE; END;
  END;
  v_is_member := public.fn_is_org_member(p_org_id, p_user_id);
  RETURN (v_is_super OR v_has_perm) AND v_is_member;
END;
$$;

-- tg_set_audit_fields
CREATE OR REPLACE FUNCTION public.tg_set_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user uuid := public.fn_current_user_id(); BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_at IS NULL THEN NEW.created_at := NOW(); END IF;
    IF NEW.updated_at IS NULL THEN NEW.updated_at := NOW(); END IF;
    BEGIN PERFORM 1 FROM pg_attribute WHERE attrelid = TG_RELID AND attname='created_by' AND NOT attisdropped; IF FOUND AND NEW.created_by IS NULL THEN NEW.created_by := v_user; END IF; EXCEPTION WHEN others THEN END;
    BEGIN PERFORM 1 FROM pg_attribute WHERE attrelid = TG_RELID AND attname='updated_by' AND NOT attisdropped; IF FOUND AND NEW.updated_by IS NULL THEN NEW.updated_by := v_user; END IF; EXCEPTION WHEN others THEN END;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_at := NOW();
    BEGIN PERFORM 1 FROM pg_attribute WHERE attrelid = TG_RELID AND attname='updated_by' AND NOT attisdropped; IF FOUND THEN NEW.updated_by := v_user; END IF; EXCEPTION WHEN others THEN END;
  END IF;
  RETURN NEW;
END; $$;

-- Grants (best-effort)
DO $$ BEGIN
  BEGIN GRANT EXECUTE ON FUNCTION public.fn_current_user_id() TO authenticated, service_role; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.fn_is_org_member(uuid, uuid) TO authenticated, service_role; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.fn_can_manage_fiscal(uuid, uuid) TO authenticated, service_role; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.tg_set_audit_fields() TO authenticated, service_role; EXCEPTION WHEN undefined_object THEN NULL; END;
END $$;