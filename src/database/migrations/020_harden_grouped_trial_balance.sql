-- 020_harden_grouped_trial_balance.sql
-- Add defense-in-depth guards to grouped Trial Balance RPCs.
-- Guards:
-- 1) Require a valid JWT (auth.uid()) unless caller role is service_role
-- 2) If public.org_members relation exists, require membership (user_id, org_id)

begin;

-- Drop and recreate with plpgsql to add guards
create or replace function public.get_trial_balance_current_grouped_tx_enhanced(
  p_org_id uuid,
  p_mode text default 'posted',
  p_project_id uuid default null
)
returns table (
  kind text,
  account_id uuid,
  code text,
  name text,
  level int,
  debit_amount numeric,
  credit_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
  v_has_org_members boolean := to_regclass('public.org_members') is not null;
BEGIN
  -- Only enforce JWT for non-service callers
  IF v_role <> 'service_role' THEN
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: missing JWT' USING ERRCODE = '28000';
    END IF;
    -- Optional org membership check if relation exists
    IF v_has_org_members THEN
      PERFORM 1 FROM public.org_members om WHERE om.user_id = v_uid AND om.org_id = p_org_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Forbidden: user is not a member of the requested organization' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN QUERY
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
END;
$$;

create or replace function public.get_account_balances_as_of_grouped_tx_enhanced(
  p_org_id uuid,
  p_as_of timestamp with time zone,
  p_mode text default 'posted',
  p_project_id uuid default null
)
returns table (
  kind text,
  account_id uuid,
  code text,
  name text,
  level int,
  debit_amount numeric,
  credit_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
  v_has_org_members boolean := to_regclass('public.org_members') is not null;
BEGIN
  IF v_role <> 'service_role' THEN
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: missing JWT' USING ERRCODE = '28000';
    END IF;
    IF v_has_org_members THEN
      PERFORM 1 FROM public.org_members om WHERE om.user_id = v_uid AND om.org_id = p_org_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Forbidden: user is not a member of the requested organization' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN QUERY
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
END;
$$;

commit;

