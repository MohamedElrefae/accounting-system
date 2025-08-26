-- 014_general_ledger_function.sql
-- Create Enterprise GL function from single-line transactions and supporting indexes/grants

begin;

-- Function: public.get_general_ledger_report
create or replace function public.get_general_ledger_report(
  p_account_id uuid default null,
  p_date_from date default null,
  p_date_to date default null,
  p_org_id uuid default null,
  p_project_id uuid default null,
  p_include_opening boolean default true,
  p_posted_only boolean default false,
  p_limit integer default null,
  p_offset integer default null
)
returns table (
  transaction_id uuid,
  entry_date date,
  entry_number text,
  description text,
  reference_number text,
  account_id uuid,
  account_code text,
  account_name_ar text,
  account_name_en text,
  debit numeric,
  credit numeric,
  signed_amount numeric,
  opening_balance numeric,
  opening_debit numeric,
  opening_credit numeric,
  running_balance numeric,
  running_debit numeric,
  running_credit numeric,
  period_total numeric,
  closing_balance numeric,
  closing_debit numeric,
  closing_credit numeric,
  org_id uuid,
  project_id uuid,
  total_rows bigint
)
language sql
security definer
set search_path = public
as $$
  with all_tx as (
    select
      tx.id as transaction_id,
      tx.entry_number,
      tx.entry_date,
      tx.description,
      tx.reference_number,
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
      tx.entry_number,
      tx.entry_date,
      tx.description,
      tx.reference_number,
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
  all_tx_filtered as (
    select *
    from all_tx
    where (p_account_id is null or account_id = p_account_id)
  ),
  opening as (
    select
      account_id,
      sum(signed_amount)::numeric as opening_balance
    from all_tx_filtered
    where p_include_opening = true
      and p_date_from is not null
      and entry_date < p_date_from
    group by account_id
  ),
  period_rows as (
    select
      t.*
    from all_tx_filtered t
    where (p_date_from is null or t.entry_date >= p_date_from)
      and (p_date_to   is null or t.entry_date <= p_date_to)
  ),
  period_with_accounts as (
    select
      p.*,
      a.code as account_code,
      coalesce(a.name_ar, a.name) as account_name_ar,
      a.name as account_name_en
    from period_rows p
    join public.accounts a on a.id = p.account_id
  ),
  with_calcs as (
    select
      pwa.*,
      coalesce(o.opening_balance, 0)::numeric as opening_balance,
      coalesce(o.opening_balance, 0)::numeric
        + sum(pwa.signed_amount) over (
            partition by pwa.account_id
            order by pwa.entry_date, pwa.entry_number, pwa.transaction_id
            rows between unbounded preceding and current row
          )::numeric as running_balance,
      sum(pwa.signed_amount) over (
        partition by pwa.account_id
        order by pwa.entry_date, pwa.entry_number, pwa.transaction_id
        rows between unbounded preceding and unbounded following
      )::numeric as period_total
    from period_with_accounts pwa
    left join opening o on o.account_id = pwa.account_id
  ),
  numbered as (
    select
      wc.*,
      row_number() over (partition by wc.account_id order by wc.entry_date, wc.entry_number, wc.transaction_id) as rn_per_account,
      row_number() over (order by wc.account_code, wc.entry_date, wc.entry_number, wc.transaction_id) as rn_global,
      count(*) over () as total_rows
    from with_calcs wc
  )
  select
    transaction_id,
    entry_date,
    entry_number,
    description,
    reference_number,
    account_id,
    account_code,
    account_name_ar,
    account_name_en,
    debit,
    credit,
    signed_amount,
    opening_balance,
    case when opening_balance > 0 then opening_balance else 0 end as opening_debit,
    case when opening_balance < 0 then abs(opening_balance) else 0 end as opening_credit,
    running_balance,
    case when running_balance > 0 then running_balance else 0 end as running_debit,
    case when running_balance < 0 then abs(running_balance) else 0 end as running_credit,
    period_total,
    (opening_balance + period_total)::numeric as closing_balance,
    case when (opening_balance + period_total) > 0 then (opening_balance + period_total) else 0 end as closing_debit,
    case when (opening_balance + period_total) < 0 then abs(opening_balance + period_total) else 0 end as closing_credit,
    org_id,
    project_id,
    total_rows
  from numbered n
  where (p_limit is null or n.rn_global > coalesce(p_offset, 0))
    and (p_limit is null or n.rn_global <= coalesce(p_offset, 0) + p_limit)
  order by n.rn_global;
$$;

-- Grants
grant execute on function public.get_general_ledger_report(uuid, date, date, uuid, uuid, boolean, boolean)
  to anon, authenticated, service_role;

-- Indexes to support filters and joins
create index if not exists idx_tx_entry_date on public.transactions(entry_date);
create index if not exists idx_tx_org_date on public.transactions(org_id, entry_date);
create index if not exists idx_tx_project on public.transactions(project_id);
create index if not exists idx_tx_debit on public.transactions(debit_account_id, entry_date);
create index if not exists idx_tx_credit on public.transactions(credit_account_id, entry_date);
create index if not exists idx_accounts_code on public.accounts(code);

commit;
