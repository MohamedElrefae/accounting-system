-- 015_gl_account_summary.sql
-- Account-level GL summary with opening/period/closing (debit/credit splits)
-- Supports org/project filters and server-side pagination

begin;

create or replace function public.get_gl_account_summary(
  p_date_from date default null,
  p_date_to date default null,
  p_org_id uuid default null,
  p_project_id uuid default null,
  p_posted_only boolean default true,
  p_limit integer default null,
  p_offset integer default null
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

grant execute on function public.get_gl_account_summary(date, date, uuid, uuid, boolean, integer, integer)
  to anon, authenticated, service_role;

commit;
