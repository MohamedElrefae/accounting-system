-- 021_secure_enhanced_trial_balance.sql
-- Tighten EXECUTE privileges on commonly used enhanced Trial Balance RPCs (flat + paginated + as-of).
-- Best-practice: allow only authenticated and service_role.

begin;

-- Current enhanced (flat)
revoke all on function public.get_trial_balance_current_tx_enhanced(uuid, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_trial_balance_current_tx_enhanced(uuid, text, uuid)
  to authenticated, service_role;

-- Current enhanced (paginated)
-- Signature: (p_org_id uuid, p_mode text, p_project_id uuid, p_limit integer, p_after_code text)
revoke all on function public.get_trial_balance_current_tx_enhanced_page(uuid, text, uuid, integer, text)
  from public, anon, authenticated, service_role;
grant execute on function public.get_trial_balance_current_tx_enhanced_page(uuid, text, uuid, integer, text)
  to authenticated, service_role;

-- As-of enhanced (flat)
revoke all on function public.get_account_balances_as_of_tx_enhanced(uuid, timestamp with time zone, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_account_balances_as_of_tx_enhanced(uuid, timestamp with time zone, text, uuid)
  to authenticated, service_role;

-- As-of enhanced (paginated)
-- Signature: (p_org_id uuid, p_as_of timestamptz, p_mode text, p_project_id uuid, p_limit integer, p_after_code text)
revoke all on function public.get_account_balances_as_of_tx_enhanced_page(uuid, timestamp with time zone, text, uuid, integer, text)
  from public, anon, authenticated, service_role;
grant execute on function public.get_account_balances_as_of_tx_enhanced_page(uuid, timestamp with time zone, text, uuid, integer, text)
  to authenticated, service_role;

commit;

