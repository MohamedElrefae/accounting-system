-- 011_trial_balance_range.sql
-- Parameterized trial balance via stable SQL function; keep original view for all-time balance.

begin;

-- Keep the base view as all-time balance
create or replace view public.v_trial_balance as
select
  a.id as account_id,
  a.code,
  a.name,
  coalesce(sum(le.debit), 0) as total_debit,
  coalesce(sum(le.credit), 0) as total_credit,
  coalesce(sum(le.debit - le.credit), 0) as balance
from public.accounts a
left join public.ledger_entries le on le.account_id = a.id
group by a.id, a.code, a.name;

-- Parameterized trial balance function
create or replace function public.trial_balance_range(p_from date, p_to date)
returns table (
  account_id uuid,
  code text,
  name text,
  opening numeric,
  period_debit numeric,
  period_credit numeric,
  closing numeric
)
language sql
stable
as $$
  with opening as (
    select account_id, sum(debit - credit) as open
    from public.ledger_entries
    where entry_date < p_from
    group by account_id
  ), period as (
    select account_id,
           sum(debit) as p_debit,
           sum(credit) as p_credit
    from public.ledger_entries
    where entry_date >= p_from and entry_date <= p_to
    group by account_id
  )
  select a.id as account_id,
         a.code,
         a.name,
         coalesce(o.open, 0) as opening,
         coalesce(p.p_debit, 0) as period_debit,
         coalesce(p.p_credit, 0) as period_credit,
         coalesce(o.open, 0) + coalesce(p.p_debit, 0) - coalesce(p.p_credit, 0) as closing
  from public.accounts a
  left join opening o on o.account_id = a.id
  left join period p on p.account_id = a.id
  order by a.code
$$;

commit;

