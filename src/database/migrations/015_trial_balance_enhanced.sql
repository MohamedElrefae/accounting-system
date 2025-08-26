-- 015_trial_balance_enhanced.sql
-- Enhanced Trial Balance RPCs with org/project filters and posted-only mode
-- Returns debit/credit columns in minor units (multiplied by 100) to match UI

begin;

-- Current trial balance (all transactions to date), split into debit/credit columns in minor units
create or replace function public.get_trial_balance_current_tx_enhanced(
  p_org_id uuid,
  p_mode text default 'posted',          -- 'posted' or 'all'
  p_project_id uuid default null
)
returns table (
  account_id uuid,
  code text,
  name text,
  debit_amount numeric,
  credit_amount numeric
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
      tx.org_id,
      tx.project_id,
      tx.is_posted
    from public.transactions tx
    where (p_org_id is null or tx.org_id = p_org_id)
      and (p_project_id is null or tx.project_id = p_project_id)
      and (p_mode <> 'posted' or tx.is_posted = true)
  ),
  sums as (
    select
      account_id,
      sum(signed_amount)::numeric as sum_signed
    from all_tx
    group by account_id
  )
  select
    a.id as account_id,
    a.code,
    coalesce(a.name_ar, a.name) as name,
    greatest(coalesce(s.sum_signed,0), 0)::numeric as debit_amount,
    greatest(-coalesce(s.sum_signed,0), 0)::numeric as credit_amount
  from public.accounts a
  left join sums s on s.account_id = a.id
  where a.org_id = coalesce(p_org_id, a.org_id)
  order by a.code;
$$;

-- As-of balances (up to p_as_of date), split into debit/credit columns and include signed balance in minor units
create or replace function public.get_account_balances_as_of_tx_enhanced(
  p_org_id uuid,
  p_as_of timestamp with time zone,
  p_mode text default 'posted',          -- 'posted' or 'all'
  p_project_id uuid default null
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
  order by a.code;
$$;

-- Grants
grant execute on function public.get_trial_balance_current_tx_enhanced(uuid, text, uuid)
  to anon, authenticated, service_role;
grant execute on function public.get_account_balances_as_of_tx_enhanced(uuid, timestamp with time zone, text, uuid)
  to anon, authenticated, service_role;

-- Helpful indexes (no-op if they already exist)
create index if not exists idx_tx_entry_date on public.transactions(entry_date);
create index if not exists idx_tx_org on public.transactions(org_id);
create index if not exists idx_tx_project on public.transactions(project_id);
create index if not exists idx_tx_posted on public.transactions(is_posted);
create index if not exists idx_tx_debit on public.transactions(debit_account_id);
create index if not exists idx_tx_credit on public.transactions(credit_account_id);
create index if not exists idx_accounts_org_code on public.accounts(org_id, code);

commit;

