-- 019_secure_grouped_trial_balance.sql
-- Tighten EXECUTE privileges on grouped Trial Balance RPCs.
-- Best-practice default: allow only authenticated users and service_role.
-- Assumes RLS on underlying tables enforces org-level access.

begin;

-- Current grouped
revoke all on function public.get_trial_balance_current_grouped_tx_enhanced(uuid, text, uuid)
  from public, anon, authenticated, service_role;

-- As-of grouped
revoke all on function public.get_account_balances_as_of_grouped_tx_enhanced(uuid, timestamp with time zone, text, uuid)
  from public, anon, authenticated, service_role;

-- Grant back minimal required roles
grant execute on function public.get_trial_balance_current_grouped_tx_enhanced(uuid, text, uuid)
  to authenticated, service_role;

grant execute on function public.get_account_balances_as_of_grouped_tx_enhanced(uuid, timestamp with time zone, text, uuid)
  to authenticated, service_role;

-- Optional: document policy
comment on function public.get_trial_balance_current_grouped_tx_enhanced(uuid, text, uuid)
  is 'Grouped Trial Balance (current). EXECUTE granted to authenticated and service_role only.';

comment on function public.get_account_balances_as_of_grouped_tx_enhanced(uuid, timestamp with time zone, text, uuid)
  is 'Grouped Trial Balance (as-of). EXECUTE granted to authenticated and service_role only.';

commit;

