-- 026_fix_asof_wrapper_return.sql
-- Ensure get_account_balances_as_of_tx_enhanced wrapper returns the original columns
-- to match client expectations and PostgREST signature.

begin;

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
  debit_amount numeric,
  credit_amount numeric,
  balance_signed_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
  v_has_is_org_member boolean := to_regprocedure('public.is_org_member(uuid, text)') is not null;
  v_has_org_memberships boolean := to_regclass('public.org_memberships') is not null;
BEGIN
  IF v_role <> 'service_role' THEN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized: missing JWT' USING ERRCODE='28000'; END IF;
    IF v_has_is_org_member THEN
      IF NOT public.is_org_member(p_org_id, 'viewer') THEN RAISE EXCEPTION 'Forbidden: user is not a member of the requested organization' USING ERRCODE='42501'; END IF;
    ELSIF v_has_org_memberships THEN
      PERFORM 1 FROM public.org_memberships m WHERE m.user_id = v_uid AND m.org_id = p_org_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Forbidden: user is not a member of the requested organization' USING ERRCODE='42501'; END IF;
    END IF;
  END IF;

  RETURN QUERY
  SELECT account_id, code, name, debit_amount, credit_amount, balance_signed_amount
  FROM public.get_account_balances_as_of_tx_enhanced_impl(p_org_id, p_as_of, p_mode, p_project_id);
END;
$$;

commit;

