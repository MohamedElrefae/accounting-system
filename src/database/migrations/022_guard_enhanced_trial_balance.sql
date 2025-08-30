-- 022_guard_enhanced_trial_balance.sql
-- Wrap enhanced Trial Balance RPCs with plpgsql guards while preserving signatures and result shapes.
-- Strategy:
-- - Rename existing functions to *_impl if present
-- - Create guarded wrappers with the original names that call the *_impl versions
-- - Guards: require JWT unless service_role; if public.org_members exists, require membership

begin;

-- Helper to rename if exists (for each function/signature)
-- get_trial_balance_current_tx_enhanced(uuid, text, uuid)
DO $$
BEGIN
  -- If impl already exists, skip renaming. If original exists and impl does not, rename.
  IF to_regprocedure('public.get_trial_balance_current_tx_enhanced_impl(uuid, text, uuid)') IS NOT NULL THEN
    -- no-op
  ELSIF to_regprocedure('public.get_trial_balance_current_tx_enhanced(uuid, text, uuid)') IS NOT NULL THEN
    EXECUTE 'alter function public.get_trial_balance_current_tx_enhanced(uuid, text, uuid) rename to get_trial_balance_current_tx_enhanced_impl';
  END IF;
END$$;

-- get_trial_balance_current_tx_enhanced_page(uuid, text, uuid, integer, text)
DO $$
BEGIN
  IF to_regprocedure('public.get_trial_balance_current_tx_enhanced_page_impl(uuid, text, uuid, integer, text)') IS NOT NULL THEN
    -- no-op
  ELSIF to_regprocedure('public.get_trial_balance_current_tx_enhanced_page(uuid, text, uuid, integer, text)') IS NOT NULL THEN
    EXECUTE 'alter function public.get_trial_balance_current_tx_enhanced_page(uuid, text, uuid, integer, text) rename to get_trial_balance_current_tx_enhanced_page_impl';
  END IF;
END$$;

-- get_account_balances_as_of_tx_enhanced(uuid, timestamptz, text, uuid)
DO $$
BEGIN
  IF to_regprocedure('public.get_account_balances_as_of_tx_enhanced_impl(uuid, timestamp with time zone, text, uuid)') IS NOT NULL THEN
    -- no-op
  ELSIF to_regprocedure('public.get_account_balances_as_of_tx_enhanced(uuid, timestamp with time zone, text, uuid)') IS NOT NULL THEN
    EXECUTE 'alter function public.get_account_balances_as_of_tx_enhanced(uuid, timestamp with time zone, text, uuid) rename to get_account_balances_as_of_tx_enhanced_impl';
  END IF;
END$$;

-- get_account_balances_as_of_tx_enhanced_page(uuid, timestamptz, text, uuid, integer, text)
DO $$
BEGIN
  IF to_regprocedure('public.get_account_balances_as_of_tx_enhanced_page_impl(uuid, timestamp with time zone, text, uuid, integer, text)') IS NOT NULL THEN
    -- no-op
  ELSIF to_regprocedure('public.get_account_balances_as_of_tx_enhanced_page(uuid, timestamp with time zone, text, uuid, integer, text)') IS NOT NULL THEN
    EXECUTE 'alter function public.get_account_balances_as_of_tx_enhanced_page(uuid, timestamp with time zone, text, uuid, integer, text) rename to get_account_balances_as_of_tx_enhanced_page_impl';
  END IF;
END$$;

-- Guarded wrapper: current enhanced (flat)
create or replace function public.get_trial_balance_current_tx_enhanced(
  p_org_id uuid,
  p_mode text,
  p_project_id uuid
)
returns table (
  account_id uuid,
  code text,
  name text,
  debit_amount numeric,
  credit_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
  v_has_org_members boolean := to_regclass('public.org_memberships') is not null;
BEGIN
  IF v_role <> 'service_role' THEN
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: missing JWT' USING ERRCODE = '28000';
    END IF;
    IF v_has_org_members THEN
      PERFORM 1 FROM public.org_memberships om WHERE om.user_id = v_uid AND om.org_id = p_org_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Forbidden: user is not a member of the requested organization' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN QUERY
  SELECT account_id, code, name, debit_amount, credit_amount
  FROM public.get_trial_balance_current_tx_enhanced_impl(p_org_id, p_mode, p_project_id);
END;
$$;

-- Guarded wrapper: current enhanced (paginated)
create or replace function public.get_trial_balance_current_tx_enhanced_page(
  p_org_id uuid,
  p_mode text,
  p_project_id uuid,
  p_limit integer,
  p_after_code text
)
returns table (
  account_id uuid,
  code text,
  name text,
  debit_amount numeric,
  credit_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
  v_has_org_members boolean := to_regclass('public.org_memberships') is not null;
BEGIN
  IF v_role <> 'service_role' THEN
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: missing JWT' USING ERRCODE = '28000';
    END IF;
    IF v_has_org_members THEN
      PERFORM 1 FROM public.org_memberships om WHERE om.user_id = v_uid AND om.org_id = p_org_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Forbidden: user is not a member of the requested organization' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN QUERY
  SELECT account_id, code, name, debit_amount, credit_amount
  FROM public.get_trial_balance_current_tx_enhanced_page_impl(p_org_id, p_mode, p_project_id, p_limit, p_after_code);
END;
$$;

-- Guarded wrapper: as-of enhanced (flat)
create or replace function public.get_account_balances_as_of_tx_enhanced(
  p_org_id uuid,
  p_as_of timestamp with time zone,
  p_mode text,
  p_project_id uuid
)
returns table (
  account_id uuid,
  code text,
  name text,
  balance_signed_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
  v_has_org_members boolean := to_regclass('public.org_memberships') is not null;
BEGIN
  IF v_role <> 'service_role' THEN
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: missing JWT' USING ERRCODE = '28000';
    END IF;
    IF v_has_org_members THEN
      PERFORM 1 FROM public.org_memberships om WHERE om.user_id = v_uid AND om.org_id = p_org_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Forbidden: user is not a member of the requested organization' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN QUERY
  SELECT account_id, code, name, balance_signed_amount
  FROM public.get_account_balances_as_of_tx_enhanced_impl(p_org_id, p_as_of, p_mode, p_project_id);
END;
$$;

-- Guarded wrapper: as-of enhanced (paginated)
create or replace function public.get_account_balances_as_of_tx_enhanced_page(
  p_org_id uuid,
  p_as_of timestamp with time zone,
  p_mode text,
  p_project_id uuid,
  p_limit integer,
  p_after_code text
)
returns table (
  account_id uuid,
  code text,
  name text,
  balance_signed_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
  v_has_org_members boolean := to_regclass('public.org_memberships') is not null;
BEGIN
  IF v_role <> 'service_role' THEN
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: missing JWT' USING ERRCODE = '28000';
    END IF;
    IF v_has_org_members THEN
      PERFORM 1 FROM public.org_memberships om WHERE om.user_id = v_uid AND om.org_id = p_org_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Forbidden: user is not a member of the requested organization' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN QUERY
  SELECT account_id, code, name, balance_signed_amount
  FROM public.get_account_balances_as_of_tx_enhanced_page_impl(p_org_id, p_as_of, p_mode, p_project_id, p_limit, p_after_code);
END;
$$;

-- Ensure grants remain strict (authenticated + service_role)
grant execute on function public.get_trial_balance_current_tx_enhanced(uuid, text, uuid)
  to authenticated, service_role;

grant execute on function public.get_trial_balance_current_tx_enhanced_page(uuid, text, uuid, integer, text)
  to authenticated, service_role;

grant execute on function public.get_account_balances_as_of_tx_enhanced(uuid, timestamp with time zone, text, uuid)
  to authenticated, service_role;

grant execute on function public.get_account_balances_as_of_tx_enhanced_page(uuid, timestamp with time zone, text, uuid, integer, text)
  to authenticated, service_role;

commit;

