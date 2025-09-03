-- 053_gl_account_summary_classification.sql
-- Updates get_gl_account_summary function to include classification_id filtering
-- This resolves the function signature mismatch issue

begin;

-- Drop the existing function first to avoid conflicts
drop function if exists public.get_gl_account_summary(date, date, uuid, uuid, boolean, integer, integer);

-- Recreate the function with the classification_id parameter
create or replace function public.get_gl_account_summary(
  p_date_from date default null,
  p_date_to date default null,
  p_org_id uuid default null,
  p_project_id uuid default null,
  p_posted_only boolean default true,
  p_limit integer default null,
  p_offset integer default null,
  p_classification_id uuid default null
)
returns table (
  account_id uuid,
  account_code text,
  account_name_ar text,
  account_name_en text,
  opening_balance numeric,
  opening_debit numeric,
  opening_credit numeric,
  period_debits numeric,
  period_credits numeric,
  period_net numeric,
  closing_balance numeric,
  closing_debit numeric,
  closing_credit numeric,
  transaction_count bigint,
  total_rows bigint
)
language sql
security definer
set search_path = public
as $$
  with tx_expanded as (
    -- Expand single-line transactions into debit/credit rows with sign
    select
      tx.id as transaction_id,
      tx.entry_date,
      tx.org_id,
      tx.project_id,
      tx.debit_account_id as account_id,
      tx.amount::numeric as debit,
      0::numeric as credit,
      tx.amount::numeric as signed_amount
    from public.transactions tx
    where true
      and (p_org_id is null or tx.org_id = p_org_id)
      and (p_project_id is null or tx.project_id = p_project_id)
      and (not p_posted_only or tx.is_posted = true)
      and (p_classification_id is null or tx.classification_id = p_classification_id)
    union all
    select
      tx.id as transaction_id,
      tx.entry_date,
      tx.org_id,
      tx.project_id,
      tx.credit_account_id as account_id,
      0::numeric as debit,
      tx.amount::numeric as credit,
      -tx.amount::numeric as signed_amount
    from public.transactions tx
    where true
      and (p_org_id is null or tx.org_id = p_org_id)
      and (p_project_id is null or tx.project_id = p_project_id)
      and (not p_posted_only or tx.is_posted = true)
      and (p_classification_id is null or tx.classification_id = p_classification_id)
  ),
  opening as (
    select
      t.account_id,
      sum(t.signed_amount)::numeric as opening_balance
    from tx_expanded t
    where p_date_from is not null
      and t.entry_date < p_date_from
    group by t.account_id
  ),
  period as (
    select
      t.account_id,
      sum(t.debit)::numeric as period_debits,
      sum(t.credit)::numeric as period_credits,
      sum(t.signed_amount)::numeric as period_net,
      count(*)::bigint as transaction_count
    from tx_expanded t
    where (p_date_from is null or t.entry_date >= p_date_from)
      and (p_date_to   is null or t.entry_date <= p_date_to)
    group by t.account_id
  ),
  combined as (
    select
      a.id as account_id,
      a.code as account_code,
      coalesce(a.name_ar, a.name) as account_name_ar,
      a.name as account_name_en,
      coalesce(o.opening_balance, 0)::numeric as opening_balance,
      coalesce(p.period_debits, 0)::numeric as period_debits,
      coalesce(p.period_credits, 0)::numeric as period_credits,
      coalesce(p.period_net, 0)::numeric as period_net,
      coalesce(p.transaction_count, 0)::bigint as transaction_count
    from public.accounts a
    left join opening o on o.account_id = a.id
    left join period  p on p.account_id = a.id
    where true
    -- Optionally, you can filter active accounts if you have a status column
  ),
  with_totals as (
    select
      c.*,
      (c.opening_balance + c.period_net)::numeric as closing_balance
    from combined c
  ),
  shaped as (
    select
      wt.*,
      case when wt.opening_balance > 0 then wt.opening_balance else 0 end as opening_debit,
      case when wt.opening_balance < 0 then abs(wt.opening_balance) else 0 end as opening_credit,
      case when wt.closing_balance > 0 then wt.closing_balance else 0 end as closing_debit,
      case when wt.closing_balance < 0 then abs(wt.closing_balance) else 0 end as closing_credit
    from with_totals wt
  ),
  numbered as (
    select
      s.*,
      count(*) over () as total_rows,
      row_number() over (order by s.account_code) as rn
    from shaped s
  )
  select
    account_id,
    account_code,
    account_name_ar,
    account_name_en,
    opening_balance,
    opening_debit,
    opening_credit,
    period_debits,
    period_credits,
    period_net,
    closing_balance,
    closing_debit,
    closing_credit,
    transaction_count,
    total_rows
  from numbered n
  where (p_limit is null or n.rn > coalesce(p_offset, 0))
    and (p_limit is null or n.rn <= coalesce(p_offset, 0) + p_limit)
  order by n.rn;
$$;

-- Grant permissions for the updated function signature
grant execute on function public.get_gl_account_summary(date, date, uuid, uuid, boolean, integer, integer, uuid)
  to anon, authenticated, service_role;

-- Update get_gl_totals function to pass the classification parameter
create or replace function public.get_gl_totals(
  p_date_from date default null,
  p_date_to date default null,
  p_org_id uuid default null,
  p_project_id uuid default null,
  p_posted_only boolean default true,
  p_classification_id uuid default null
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
      null,
      p_classification_id
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

-- Update grants for get_gl_totals
grant execute on function public.get_gl_totals(date, date, uuid, uuid, boolean, uuid)
  to anon, authenticated, service_role;

-- Update get_account_children_with_balances function to pass the classification parameter
create or replace function public.get_account_children_with_balances(
  p_org_id uuid default null,
  p_parent_id uuid default null,
  p_date_from date default null,
  p_date_to date default null,
  p_posted_only boolean default true,
  p_project_id uuid default null,
  p_mode text default 'asof',
  p_classification_id uuid default null
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
      null,
      p_classification_id
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

-- Update grants for get_account_children_with_balances
grant execute on function public.get_account_children_with_balances(uuid, uuid, date, date, boolean, uuid, text, uuid)
  to anon, authenticated, service_role;

commit;
