-- 024_use_is_org_member_guards.sql
-- Prefer the public.is_org_member() helper in function guards when available.
-- Falls back to direct table check when helper is absent.

begin;

-- Helper inline SQL snippet usable in plpgsql: checks membership via is_org_member if present, else direct table
-- We'll recreate guarded functions using a CASE on to_regprocedure('public.is_org_member(uuid, text)')

-- Update grouped (current)
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
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
  v_has_is_org_member boolean := to_regprocedure('public.is_org_member(uuid, text)') is not null;
  v_has_org_memberships boolean := to_regclass('public.org_memberships') is not null;
begin
  if v_role <> 'service_role' then
    if v_uid is null then
      raise exception 'Unauthorized: missing JWT' using errcode = '28000';
    end if;
    if v_has_is_org_member then
      if not public.is_org_member(p_org_id, 'viewer') then
        raise exception 'Forbidden: user is not a member of the requested organization' using errcode = '42501';
      end if;
    elsif v_has_org_memberships then
      perform 1 from public.org_memberships m where m.user_id = v_uid and m.org_id = p_org_id;
      if not found then
        raise exception 'Forbidden: user is not a member of the requested organization' using errcode = '42501';
      end if;
    end if;
  end if;

  return query
  with all_tx as (
    select tx.debit_account_id as account_id, tx.amount::numeric as signed_amount, tx.org_id, tx.project_id, tx.is_posted
    from public.transactions tx
    where (p_org_id is null or tx.org_id = p_org_id)
      and (p_project_id is null or tx.project_id = p_project_id)
      and (p_mode <> 'posted' or tx.is_posted = true)
    union all
    select tx.credit_account_id as account_id, -tx.amount::numeric as signed_amount, tx.org_id, tx.project_id, tx.is_posted
    from public.transactions tx
    where (p_org_id is null or tx.org_id = p_org_id)
      and (p_project_id is null or tx.project_id = p_project_id)
      and (p_mode <> 'posted' or tx.is_posted = true)
  ),
  sums as (
    select account_id, sum(signed_amount)::numeric as sum_signed from all_tx group by account_id
  ),
  leaf_amounts as (
    select a.id as account_id, coalesce(s.sum_signed, 0)::numeric as sum_signed
    from public.accounts a left join sums s on s.account_id = a.id
    where a.org_id = coalesce(p_org_id, a.org_id)
  ),
  base_nodes as (
    select la.account_id as id from leaf_amounts la where la.sum_signed <> 0
  ),
  recursive_ancestors as (
    with recursive anc as (
      select b.id as node_id, b.id as ancestor_id from base_nodes b
      union all
      select anc.node_id, p.id as ancestor_id
      from anc join public.accounts c on c.id = anc.ancestor_id
               join public.accounts p on p.id = c.parent_id
    ) select node_id, ancestor_id from anc
  ),
  grouped as (
    select ra.ancestor_id as account_id, sum(la.sum_signed)::numeric as sum_signed
    from recursive_ancestors ra join leaf_amounts la on la.account_id = ra.node_id
    group by ra.ancestor_id
  ),
  groups_rows as (
    select 'group'::text as kind, null::uuid as account_id, a.code,
           coalesce(a.name_ar, a.name) as name, coalesce(a.level, 1)::int as level,
           greatest(coalesce(g.sum_signed,0), 0)::numeric as debit_amount,
           greatest(-coalesce(g.sum_signed,0), 0)::numeric as credit_amount
    from public.accounts a join grouped g on g.account_id = a.id
    where a.org_id = coalesce(p_org_id, a.org_id)
      and exists (select 1 from public.accounts c where c.parent_id = a.id)
  ),
  leaf_rows as (
    select 'account'::text as kind, a.id as account_id, a.code,
           coalesce(a.name_ar, a.name) as name, coalesce(a.level, 1)::int as level,
           greatest(coalesce(la.sum_signed,0), 0)::numeric as debit_amount,
           greatest(-coalesce(la.sum_signed,0), 0)::numeric as credit_amount
    from public.accounts a left join leaf_amounts la on la.account_id = a.id
    where a.org_id = coalesce(p_org_id, a.org_id)
  )
  select * from groups_rows
  union all
  select * from leaf_rows
  order by code, kind desc;
end;$$;

-- Update grouped (as-of)
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
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
  v_has_is_org_member boolean := to_regprocedure('public.is_org_member(uuid, text)') is not null;
  v_has_org_memberships boolean := to_regclass('public.org_memberships') is not null;
begin
  if v_role <> 'service_role' then
    if v_uid is null then
      raise exception 'Unauthorized: missing JWT' using errcode = '28000';
    end if;
    if v_has_is_org_member then
      if not public.is_org_member(p_org_id, 'viewer') then
        raise exception 'Forbidden: user is not a member of the requested organization' using errcode = '42501';
      end if;
    elsif v_has_org_memberships then
      perform 1 from public.org_memberships m where m.user_id = v_uid and m.org_id = p_org_id;
      if not found then
        raise exception 'Forbidden: user is not a member of the requested organization' using errcode = '42501';
      end if;
    end if;
  end if;

  return query
  with all_tx as (
    select tx.debit_account_id as account_id, tx.amount::numeric as signed_amount, tx.entry_date, tx.org_id, tx.project_id, tx.is_posted
    from public.transactions tx
    where (p_org_id is null or tx.org_id = p_org_id)
      and (p_project_id is null or tx.project_id = p_project_id)
      and (p_mode <> 'posted' or tx.is_posted = true)
    union all
    select tx.credit_account_id as account_id, -tx.amount::numeric as signed_amount, tx.entry_date, tx.org_id, tx.project_id, tx.is_posted
    from public.transactions tx
    where (p_org_id is null or tx.org_id = p_org_id)
      and (p_project_id is null or tx.project_id = p_project_id)
      and (p_mode <> 'posted' or tx.is_posted = true)
  ),
  sums_as_of as (
    select account_id, sum(signed_amount)::numeric as sum_signed
    from all_tx where p_as_of is null or entry_date <= p_as_of::date
    group by account_id
  ),
  leaf_amounts as (
    select a.id as account_id, coalesce(s.sum_signed, 0)::numeric as sum_signed
    from public.accounts a left join sums_as_of s on s.account_id = a.id
    where a.org_id = coalesce(p_org_id, a.org_id)
  ),
  base_nodes as (
    select la.account_id as id from leaf_amounts la where la.sum_signed <> 0
  ),
  recursive_ancestors as (
    with recursive anc as (
      select b.id as node_id, b.id as ancestor_id from base_nodes b
      union all
      select anc.node_id, p.id as ancestor_id
      from anc join public.accounts c on c.id = anc.ancestor_id
               join public.accounts p on p.id = c.parent_id
    ) select node_id, ancestor_id from anc
  ),
  grouped as (
    select ra.ancestor_id as account_id, sum(la.sum_signed)::numeric as sum_signed
    from recursive_ancestors ra join leaf_amounts la on la.account_id = ra.node_id
    group by ra.ancestor_id
  ),
  groups_rows as (
    select 'group'::text as kind, null::uuid as account_id, a.code,
           coalesce(a.name_ar, a.name) as name, coalesce(a.level, 1)::int as level,
           greatest(coalesce(g.sum_signed,0), 0)::numeric as debit_amount,
           greatest(-coalesce(g.sum_signed,0), 0)::numeric as credit_amount
    from public.accounts a join grouped g on g.account_id = a.id
    where a.org_id = coalesce(p_org_id, a.org_id)
      and exists (select 1 from public.accounts c where c.parent_id = a.id)
  ),
  leaf_rows as (
    select 'account'::text as kind, a.id as account_id, a.code,
           coalesce(a.name_ar, a.name) as name, coalesce(a.level, 1)::int as level,
           greatest(coalesce(la.sum_signed,0), 0)::numeric as debit_amount,
           greatest(-coalesce(la.sum_signed,0), 0)::numeric as credit_amount
    from public.accounts a left join leaf_amounts la on la.account_id = a.id
    where a.org_id = coalesce(p_org_id, a.org_id)
  )
  select * from groups_rows
  union all
  select * from leaf_rows
  order by code, kind desc;
end;$$;

-- Update enhanced wrappers to use is_org_member() when present
create or replace function public.get_trial_balance_current_tx_enhanced(
  p_org_id uuid,
  p_mode text,
  p_project_id uuid
)
returns table (
  account_id uuid,
  code text,
  name text,
  debit_amount numeric,
  credit_amount numeric
)
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
  v_has_is_org_member boolean := to_regprocedure('public.is_org_member(uuid, text)') is not null;
  v_has_org_memberships boolean := to_regclass('public.org_memberships') is not null;
begin
  if v_role <> 'service_role' then
    if v_uid is null then raise exception 'Unauthorized: missing JWT' using errcode='28000'; end if;
    if v_has_is_org_member then
      if not public.is_org_member(p_org_id, 'viewer') then raise exception 'Forbidden: user is not a member of the requested organization' using errcode='42501'; end if;
    elsif v_has_org_memberships then
      perform 1 from public.org_memberships m where m.user_id = v_uid and m.org_id = p_org_id;
      if not found then raise exception 'Forbidden: user is not a member of the requested organization' using errcode='42501'; end if;
    end if;
  end if;
  return query select account_id, code, name, debit_amount, credit_amount
  from public.get_trial_balance_current_tx_enhanced_impl(p_org_id, p_mode, p_project_id);
end;$$;

create or replace function public.get_trial_balance_current_tx_enhanced_page(
  p_org_id uuid,
  p_mode text,
  p_project_id uuid,
  p_limit integer,
  p_after_code text
)
returns table (
  account_id uuid,
  code text,
  name text,
  debit_amount numeric,
  credit_amount numeric
)
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
  v_has_is_org_member boolean := to_regprocedure('public.is_org_member(uuid, text)') is not null;
  v_has_org_memberships boolean := to_regclass('public.org_memberships') is not null;
begin
  if v_role <> 'service_role' then
    if v_uid is null then raise exception 'Unauthorized: missing JWT' using errcode='28000'; end if;
    if v_has_is_org_member then
      if not public.is_org_member(p_org_id, 'viewer') then raise exception 'Forbidden: user is not a member of the requested organization' using errcode='42501'; end if;
    elsif v_has_org_memberships then
      perform 1 from public.org_memberships m where m.user_id = v_uid and m.org_id = p_org_id;
      if not found then raise exception 'Forbidden: user is not a member of the requested organization' using errcode='42501'; end if;
    end if;
  end if;
  return query select account_id, code, name, debit_amount, credit_amount
  from public.get_trial_balance_current_tx_enhanced_page_impl(p_org_id, p_mode, p_project_id, p_limit, p_after_code);
end;$$;

create or replace function public.get_account_balances_as_of_tx_enhanced(
  p_org_id uuid,
  p_as_of timestamp with time zone,
  p_mode text,
  p_project_id uuid
)
returns table (
  account_id uuid,
  code text,
  name text,
  balance_signed_amount numeric
)
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
  v_has_is_org_member boolean := to_regprocedure('public.is_org_member(uuid, text)') is not null;
  v_has_org_memberships boolean := to_regclass('public.org_memberships') is not null;
begin
  if v_role <> 'service_role' then
    if v_uid is null then raise exception 'Unauthorized: missing JWT' using errcode='28000'; end if;
    if v_has_is_org_member then
      if not public.is_org_member(p_org_id, 'viewer') then raise exception 'Forbidden: user is not a member of the requested organization' using errcode='42501'; end if;
    elsif v_has_org_memberships then
      perform 1 from public.org_memberships m where m.user_id = v_uid and m.org_id = p_org_id;
      if not found then raise exception 'Forbidden: user is not a member of the requested organization' using errcode='42501'; end if;
    end if;
  end if;
  return query select account_id, code, name, balance_signed_amount
  from public.get_account_balances_as_of_tx_enhanced_impl(p_org_id, p_as_of, p_mode, p_project_id);
end;$$;

create or replace function public.get_account_balances_as_of_tx_enhanced_page(
  p_org_id uuid,
  p_as_of timestamp with time zone,
  p_mode text,
  p_project_id uuid,
  p_limit integer,
  p_after_code text
)
returns table (
  account_id uuid,
  code text,
  name text,
  balance_signed_amount numeric
)
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
  v_has_is_org_member boolean := to_regprocedure('public.is_org_member(uuid, text)') is not null;
  v_has_org_memberships boolean := to_regclass('public.org_memberships') is not null;
begin
  if v_role <> 'service_role' then
    if v_uid is null then raise exception 'Unauthorized: missing JWT' using errcode='28000'; end if;
    if v_has_is_org_member then
      if not public.is_org_member(p_org_id, 'viewer') then raise exception 'Forbidden: user is not a member of the requested organization' using errcode='42501'; end if;
    elsif v_has_org_memberships then
      perform 1 from public.org_memberships m where m.user_id = v_uid and m.org_id = p_org_id;
      if not found then raise exception 'Forbidden: user is not a member of the requested organization' using errcode='42501'; end if;
    end if;
  end if;
  return query select account_id, code, name, balance_signed_amount
  from public.get_account_balances_as_of_tx_enhanced_page_impl(p_org_id, p_as_of, p_mode, p_project_id, p_limit, p_after_code);
end;$$;

commit;

