-- 017_trial_balance_asof_pagination.sql
-- Adds paginated As-Of Trial Balance RPC to support keyset pagination by account code.

begin;

create or replace function public.get_account_balances_as_of_tx_enhanced_page(
  p_org_id uuid,
  p_as_of timestamp with time zone,
  p_mode text default 'posted',          -- 'posted' or 'all'
  p_project_id uuid default null,
  p_limit integer default 200,
  p_after_code text default null
)
returns table (
  account_id uuid,
  code text,
  name text,
  debit_amount numeric,
  credit_amount numeric,
  balance_signed_amount numeric
)
language sql
security definer
set search_path = public
as $$
  with all_tx as (
    -- Debit rows: positive signed
    select
      tx.debit_account_id as account_id,
      tx.amount::numeric as signed_amount,
      tx.entry_date,
      tx.org_id,
      tx.project_id,
      tx.is_posted
    from public.transactions tx
    where (p_org_id is null or tx.org_id = p_org_id)
      and (p_project_id is null or tx.project_id = p_project_id)
      and (p_mode <> 'posted' or tx.is_posted = true)
    union all
    -- Credit rows: negative signed
    select
      tx.credit_account_id as account_id,
      -tx.amount::numeric as signed_amount,
      tx.entry_date,
      tx.org_id,
      tx.project_id,
      tx.is_posted
    from public.transactions tx
    where (p_org_id is null or tx.org_id = p_org_id)
      and (p_project_id is null or tx.project_id = p_project_id)
      and (p_mode <> 'posted' or tx.is_posted = true)
  ),
  sums_as_of as (
    select
      account_id,
      sum(signed_amount)::numeric as sum_signed
    from all_tx
    where p_as_of is null or entry_date <= p_as_of::date
    group by account_id
  )
  select
    a.id as account_id,
    a.code,
    coalesce(a.name_ar, a.name) as name,
    greatest(coalesce(s.sum_signed,0), 0)::numeric as debit_amount,
    greatest(-coalesce(s.sum_signed,0), 0)::numeric as credit_amount,
    coalesce(s.sum_signed,0)::numeric as balance_signed_amount
  from public.accounts a
  left join sums_as_of s on s.account_id = a.id
  where a.org_id = coalesce(p_org_id, a.org_id)
    and (p_after_code is null or a.code > p_after_code)
  order by a.code
  limit greatest(1, coalesce(p_limit, 200));
$$;

grant execute on function public.get_account_balances_as_of_tx_enhanced_page(uuid, timestamp with time zone, text, uuid, integer, text)
  to anon, authenticated, service_role;

commit;

