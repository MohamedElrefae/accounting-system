-- 018_trial_balance_grouped.sql
-- Adds grouped hierarchical Trial Balance RPCs (current and as-of) that compute group totals on the server.

begin;

-- Current period grouped trial balance by accounts hierarchy
create or replace function public.get_trial_balance_current_grouped_tx_enhanced(
  p_org_id uuid,
  p_mode text default 'posted',          -- 'posted' or 'all'
  p_project_id uuid default null
)
returns table (
  kind text,                 -- 'group' or 'account'
  account_id uuid,           -- null for groups
  code text,
  name text,
  level int,
  debit_amount numeric,
  credit_amount numeric
)
language sql
security definer
set search_path = public
as $$
  with all_tx as (
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
    select account_id, sum(signed_amount)::numeric as sum_signed
    from all_tx
    group by account_id
  ),
  leaf_amounts as (
    select a.id as account_id,
           coalesce(s.sum_signed, 0)::numeric as sum_signed
    from public.accounts a
    left join sums s on s.account_id = a.id
    where a.org_id = coalesce(p_org_id, a.org_id)
  ),
  -- Build ancestor relationships only for accounts that have any amount (non-zero) to limit size
  base_nodes as (
    select la.account_id as id
    from leaf_amounts la
    where la.sum_signed <> 0
  ),
  recursive_ancestors as (
    with recursive anc as (
      select b.id as node_id, b.id as ancestor_id
      from base_nodes b
      union all
      select anc.node_id, p.id as ancestor_id
      from anc
      join public.accounts c on c.id = anc.ancestor_id
      join public.accounts p on p.id = c.parent_id
    )
    select node_id, ancestor_id from anc
  ),
  grouped as (
    -- Sum leaf amounts to each ancestor (including self)
    select ra.ancestor_id as account_id,
           sum(la.sum_signed)::numeric as sum_signed
    from recursive_ancestors ra
    join leaf_amounts la on la.account_id = ra.node_id
    group by ra.ancestor_id
  ),
  groups_rows as (
    -- Only output as 'group' those accounts that have at least one child
    select 
      'group'::text as kind,
      null::uuid as account_id,
      a.code,
      coalesce(a.name_ar, a.name) as name,
      coalesce(a.level, 1)::int as level,
      greatest(coalesce(g.sum_signed,0), 0)::numeric as debit_amount,
      greatest(-coalesce(g.sum_signed,0), 0)::numeric as credit_amount
    from public.accounts a
    join grouped g on g.account_id = a.id
    where a.org_id = coalesce(p_org_id, a.org_id)
      and exists (select 1 from public.accounts c where c.parent_id = a.id)
  ),
  leaf_rows as (
    select 
      'account'::text as kind,
      a.id as account_id,
      a.code,
      coalesce(a.name_ar, a.name) as name,
      coalesce(a.level, 1)::int as level,
      greatest(coalesce(la.sum_signed,0), 0)::numeric as debit_amount,
      greatest(-coalesce(la.sum_signed,0), 0)::numeric as credit_amount
    from public.accounts a
    left join leaf_amounts la on la.account_id = a.id
    where a.org_id = coalesce(p_org_id, a.org_id)
  )
  select * from groups_rows
  union all
  select * from leaf_rows
  order by code, kind desc;  -- ensure groups (kind='group') come before accounts with same code
$$;

grant execute on function public.get_trial_balance_current_grouped_tx_enhanced(uuid, text, uuid)
  to anon, authenticated, service_role;

-- As-of grouped trial balance by accounts hierarchy
create or replace function public.get_account_balances_as_of_grouped_tx_enhanced(
  p_org_id uuid,
  p_as_of timestamp with time zone,
  p_mode text default 'posted',          -- 'posted' or 'all'
  p_project_id uuid default null
)
returns table (
  kind text,                 -- 'group' or 'account'
  account_id uuid,           -- null for groups
  code text,
  name text,
  level int,
  debit_amount numeric,
  credit_amount numeric
)
language sql
security definer
set search_path = public
as $$
  with all_tx as (
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
    select account_id, sum(signed_amount)::numeric as sum_signed
    from all_tx
    where p_as_of is null or entry_date <= p_as_of::date
    group by account_id
  ),
  leaf_amounts as (
    select a.id as account_id,
           coalesce(s.sum_signed, 0)::numeric as sum_signed
    from public.accounts a
    left join sums_as_of s on s.account_id = a.id
    where a.org_id = coalesce(p_org_id, a.org_id)
  ),
  base_nodes as (
    select la.account_id as id
    from leaf_amounts la
    where la.sum_signed <> 0
  ),
  recursive_ancestors as (
    with recursive anc as (
      select b.id as node_id, b.id as ancestor_id
      from base_nodes b
      union all
      select anc.node_id, p.id as ancestor_id
      from anc
      join public.accounts c on c.id = anc.ancestor_id
      join public.accounts p on p.id = c.parent_id
    )
    select node_id, ancestor_id from anc
  ),
  grouped as (
    select ra.ancestor_id as account_id,
           sum(la.sum_signed)::numeric as sum_signed
    from recursive_ancestors ra
    join leaf_amounts la on la.account_id = ra.node_id
    group by ra.ancestor_id
  ),
  groups_rows as (
    select 
      'group'::text as kind,
      null::uuid as account_id,
      a.code,
      coalesce(a.name_ar, a.name) as name,
      coalesce(a.level, 1)::int as level,
      greatest(coalesce(g.sum_signed,0), 0)::numeric as debit_amount,
      greatest(-coalesce(g.sum_signed,0), 0)::numeric as credit_amount
    from public.accounts a
    join grouped g on g.account_id = a.id
    where a.org_id = coalesce(p_org_id, a.org_id)
      and exists (select 1 from public.accounts c where c.parent_id = a.id)
  ),
  leaf_rows as (
    select 
      'account'::text as kind,
      a.id as account_id,
      a.code,
      coalesce(a.name_ar, a.name) as name,
      coalesce(a.level, 1)::int as level,
      greatest(coalesce(la.sum_signed,0), 0)::numeric as debit_amount,
      greatest(-coalesce(la.sum_signed,0), 0)::numeric as credit_amount
    from public.accounts a
    left join leaf_amounts la on la.account_id = a.id
    where a.org_id = coalesce(p_org_id, a.org_id)
  )
  select * from groups_rows
  union all
  select * from leaf_rows
  order by code, kind desc;
$$;

grant execute on function public.get_account_balances_as_of_grouped_tx_enhanced(uuid, timestamp with time zone, text, uuid)
  to anon, authenticated, service_role;

commit;

