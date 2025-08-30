-- 032_transactions_date_range.sql
-- Returns the min and max entry_date from transactions with optional filters

begin;

create or replace function public.get_transactions_date_range(
  p_org_id uuid default null,
  p_project_id uuid default null,
  p_posted_only boolean default false
)
returns table (
  min_date date,
  max_date date
)
language sql
security definer
set search_path = public
as $$
  select
    min(tx.entry_date)::date as min_date,
    max(tx.entry_date)::date as max_date
  from public.transactions tx
  where (p_org_id is null or tx.org_id = p_org_id)
    and (p_project_id is null or tx.project_id = p_project_id)
    and (not p_posted_only or tx.is_posted = true);
$$;

grant execute on function public.get_transactions_date_range(uuid, uuid, boolean)
  to anon, authenticated, service_role;

commit;

