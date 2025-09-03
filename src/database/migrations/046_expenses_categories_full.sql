-- 046_expenses_categories_full.sql
-- Combined view that adds accounts info and rollups to expenses categories for UI consumption

begin;

drop view if exists public.expenses_categories_full;
create view public.expenses_categories_full as
select
  ec.id,
  ec.org_id,
  ec.parent_id,
  ec.code,
  ec.description,
  ec.add_to_cost,
  ec.is_active,
  ec.level,
  ec.path::text as path,
  ec.linked_account_id,
  a.code as linked_account_code,
  coalesce(a.name_ar, a.name) as linked_account_name,
  r.child_count,
  r.has_transactions,
  r.total_debit_amount,
  r.total_credit_amount,
  r.net_amount
from public.expenses_categories ec
left join public.accounts a on a.id = ec.linked_account_id
left join public.mv_expenses_categories_rollups r on r.id = ec.id;

grant select on public.expenses_categories_full to anon, authenticated, service_role;

commit;

