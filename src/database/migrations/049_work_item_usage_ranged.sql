-- 049_work_item_usage_ranged.sql
-- Adds RPC with date range support for Work Item Usage report

begin;

create or replace function public.get_work_item_usage_ranged(
  p_org_id uuid default null,
  p_project_id uuid default null,
  p_search text default null,
  p_only_with_tx boolean default false,
  p_date_from date default null,
  p_date_to date default null
)
returns table (
  org_id uuid,
  project_id uuid,
  work_item_id uuid,
  code text,
  name text,
  name_ar text,
  tx_count bigint,
  total_amount numeric
)
language plpgsql
security definer
set search_path = public as $$
declare
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
  v_has_is_org_member boolean := to_regprocedure('public.is_org_member(uuid, text)') is not null;
  v_has_org_memberships boolean := to_regclass('public.org_memberships') is not null;
begin
  -- Authorization guard: if org provided, ensure viewer membership using helper if present
  if p_org_id is not null and v_role <> 'service_role' then
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
  with member_orgs as (
    -- If org not provided, restrict to orgs where current user is a member
    select o.id as org_id
    from public.organizations o
    where (
      p_org_id is not null
      and o.id = p_org_id
    ) or (
      p_org_id is null
      and v_uid is not null
      and v_has_org_memberships
      and exists (
        select 1 from public.org_memberships m
        where m.org_id = o.id and m.user_id = v_uid
      )
    )
  ), items as (
    select wi.id as work_item_id, wi.org_id, wi.project_id, wi.code, wi.name, wi.name_ar
    from public.work_items wi
    join member_orgs mo on mo.org_id = wi.org_id
    where (p_project_id is null or wi.project_id = p_project_id)
      and (p_search is null or p_search = ''
           or wi.code ilike ('%' || p_search || '%')
           or wi.name ilike ('%' || p_search || '%')
           or wi.name_ar ilike ('%' || p_search || '%'))
  ), tx as (
    select t.work_item_id,
           count(*)::bigint as tx_count,
           coalesce(sum(t.amount), 0)::numeric as total_amount
    from public.transactions t
    join member_orgs mo on mo.org_id = t.org_id
    where t.work_item_id is not null
      and (p_project_id is null or t.project_id = p_project_id)
      and (p_date_from is null or t.entry_date >= p_date_from)
      and (p_date_to is null or t.entry_date <= p_date_to)
    group by t.work_item_id
  )
  select i.org_id, i.project_id, i.work_item_id, i.code, i.name, i.name_ar,
         coalesce(tx.tx_count, 0) as tx_count,
         coalesce(tx.total_amount, 0)::numeric as total_amount
  from items i
  left join tx on tx.work_item_id = i.work_item_id
  where (not p_only_with_tx) or coalesce(tx.tx_count, 0) > 0
  order by i.code;
end;$$;

commit;

