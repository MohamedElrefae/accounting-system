-- 029_account_explorer_children.sql
-- Provides account explorer immediate children with balances (opening/period/closing)
-- Uses existing public.get_gl_account_summary for accurate totals and splits

begin;

create or replace function public.get_account_children_with_balances(
  p_org_id uuid default null,
  p_parent_id uuid default null,
  p_date_from date default null,
  p_date_to date default null,
  p_posted_only boolean default true,
  p_project_id uuid default null,
  p_mode text default 'asof'
)
returns table (
  id uuid,
  code text,
  name text,
  name_ar text,
  level int,
  status text,
  parent_id uuid,
  category text,
  has_children boolean,
  has_active_children boolean,
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
  with target_accounts as (
    select a.*
    from public.accounts a
    where (p_parent_id is null and a.parent_id is null)
       or (p_parent_id is not null and a.parent_id = p_parent_id)
  ),
  summary as (
    select s.*
    from public.get_gl_account_summary(
      case when lower(coalesce(p_mode,'asof')) = 'range' then p_date_from else null end,
      p_date_to,
      p_org_id,
      p_project_id,
      p_posted_only,
      null,
      null
    ) s
  )
  select
    ta.id,
    ta.code,
    ta.name,
    ta.name_ar,
    ta.level,
    ta.status,
    ta.parent_id,
    ta.category,
    exists (select 1 from public.accounts c where c.parent_id = ta.id) as has_children,
    exists (select 1 from public.accounts c where c.parent_id = ta.id and c.status = 'active') as has_active_children,
    case when lower(coalesce(p_mode,'asof')) = 'range' then coalesce(sm.opening_debit, 0) else 0 end as opening_debit,
    case when lower(coalesce(p_mode,'asof')) = 'range' then coalesce(sm.opening_credit, 0) else 0 end as opening_credit,
    case when lower(coalesce(p_mode,'asof')) = 'range' then coalesce(sm.period_debits, 0) else 0 end as period_debits,
    case when lower(coalesce(p_mode,'asof')) = 'range' then coalesce(sm.period_credits, 0) else 0 end as period_credits,
    coalesce(sm.closing_debit, 0) as closing_debit,
    coalesce(sm.closing_credit, 0) as closing_credit,
    coalesce(sm.transaction_count, 0) as transaction_count
  from target_accounts ta
  left join summary sm on sm.account_id = ta.id
  where (p_org_id is null or exists (
    select 1 from public.accounts a2 where a2.id = ta.id and a2.org_id = p_org_id
  ))
  order by ta.code;
$$;

-- Permissions
grant execute on function public.get_account_children_with_balances(uuid, uuid, date, date, boolean, uuid, text)
  to anon, authenticated, service_role;

commit;

