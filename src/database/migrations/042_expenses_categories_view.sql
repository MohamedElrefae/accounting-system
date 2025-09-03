-- 042_expenses_categories_view.sql
-- View joining linked account info and exposing path text

begin;

drop view if exists public.expenses_categories_with_accounts;
create view public.expenses_categories_with_accounts as
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
  coalesce(a.name_ar, a.name) as linked_account_name
from public.expenses_categories ec
left join public.accounts a on a.id = ec.linked_account_id;

grant select on public.expenses_categories_with_accounts to anon, authenticated, service_role;

commit;

