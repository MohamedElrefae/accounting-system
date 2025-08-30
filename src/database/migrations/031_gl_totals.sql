-- 031_gl_totals.sql
-- Aggregates global totals from get_gl_account_summary for current filters

begin;

create or replace function public.get_gl_totals(
  p_date_from date default null,
  p_date_to date default null,
  p_org_id uuid default null,
  p_project_id uuid default null,
  p_posted_only boolean default true
)
returns table (
  opening_debit numeric,
  opening_credit numeric,
  period_debits numeric,
  period_credits numeric,
  closing_debit numeric,
  closing_credit numeric,
  transaction_count bigint
)
language sql
security definer
set search_path = public
as $$
  with s as (
    select * from public.get_gl_account_summary(
      p_date_from,
      p_date_to,
      p_org_id,
      p_project_id,
      p_posted_only,
      null,
      null
    )
  )
  select
    coalesce(sum(opening_debit), 0)::numeric   as opening_debit,
    coalesce(sum(opening_credit), 0)::numeric  as opening_credit,
    coalesce(sum(period_debits), 0)::numeric   as period_debits,
    coalesce(sum(period_credits), 0)::numeric  as period_credits,
    coalesce(sum(closing_debit), 0)::numeric   as closing_debit,
    coalesce(sum(closing_credit), 0)::numeric  as closing_credit,
    coalesce(sum(transaction_count), 0)::bigint as transaction_count
  from s;
$$;

grant execute on function public.get_gl_totals(date, date, uuid, uuid, boolean)
  to anon, authenticated, service_role;

commit;

