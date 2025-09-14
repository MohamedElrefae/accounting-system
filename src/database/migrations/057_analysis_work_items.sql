-- 057_analysis_work_items.sql
-- Analysis Work Items: single-level catalog per organization (no project_id column).
-- Project is selected/filtered via transactions table at usage time.

begin;

-- 1) Table
create table if not exists public.analysis_work_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  name_ar text,
  description text,
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analysis_work_items_code_not_empty check (btrim(code) <> ''),
  constraint analysis_work_items_name_not_empty check (btrim(name) <> ''),
  constraint analysis_work_items_unique_code_per_org unique (org_id, code)
);

-- 2) RLS
alter table public.analysis_work_items enable row level security;

create policy analysis_work_items_select on public.analysis_work_items
  for select using (
    case when auth.role() = 'service_role' then true
         when auth.uid() is null then false
         else exists (
           select 1 from public.org_memberships m
           where m.org_id = analysis_work_items.org_id and m.user_id = auth.uid()
         ) end
  );

create policy analysis_work_items_insert on public.analysis_work_items
  for insert with check (
    case when auth.role() = 'service_role' then true
         when auth.uid() is null then false
         else exists (
           select 1 from public.org_memberships m
           where m.org_id = analysis_work_items.org_id and m.user_id = auth.uid() and m.role in ('admin','editor')
         ) end
  );

create policy analysis_work_items_update on public.analysis_work_items
  for update using (
    case when auth.role() = 'service_role' then true
         when auth.uid() is null then false
         else exists (
           select 1 from public.org_memberships m
           where m.org_id = analysis_work_items.org_id and m.user_id = auth.uid() and m.role in ('admin','editor')
         ) end
  );

create policy analysis_work_items_delete on public.analysis_work_items
  for delete using (
    case when auth.role() = 'service_role' then true
         when auth.uid() is null then false
         else exists (
           select 1 from public.org_memberships m
           where m.org_id = analysis_work_items.org_id and m.user_id = auth.uid() and m.role = 'admin'
         ) end
  );

-- 3) Indexes
create index if not exists idx_awi_org on public.analysis_work_items(org_id);
create index if not exists idx_awi_code on public.analysis_work_items(code);
create index if not exists idx_awi_active on public.analysis_work_items(is_active);

-- 4) updated_at trigger
create or replace function public.set_updated_at_awi()
returns trigger
language plpgsql
security definer
set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;$$;

create trigger trg_set_updated_at_awi
  before update on public.analysis_work_items
  for each row execute function public.set_updated_at_awi();

-- 4.5) Add nullable foreign key on transactions to point to analysis work items
-- This enables linking transactions to analysis items without affecting existing data
alter table public.transactions
  add column if not exists analysis_work_item_id uuid null;

-- Ensure FK constraint (re-create defensively)
alter table public.transactions drop constraint if exists fk_transactions_analysis_work_item;
alter table public.transactions
  add constraint fk_transactions_analysis_work_item
  foreign key (analysis_work_item_id)
  references public.analysis_work_items(id)
  on delete restrict;

-- Helpful index for reporting
create index if not exists idx_transactions_analysis_work_item_id on public.transactions(analysis_work_item_id);

-- 5) View with transaction rollups (joins transactions by analysis_work_item_id)
-- Note: project filters are applied at query time via transactions table
-- Also, we will add a delete guard trigger to disallow deleting items with transactions
create or replace view public.analysis_work_items_full as
select
  awi.*,
  coalesce(r.tx_count, 0) as transaction_count,
  coalesce(r.total_debit_amount, 0) as total_debit_amount,
  coalesce(r.total_credit_amount, 0) as total_credit_amount,
  coalesce(r.net_amount, 0) as net_amount,
  (coalesce(r.tx_count, 0) > 0) as has_transactions
from public.analysis_work_items awi
left join (
  select 
    t.analysis_work_item_id,
    count(*)::bigint as tx_count,
    sum(case when t.amount > 0 then t.amount else 0 end)::numeric as total_debit_amount,
    sum(case when t.amount < 0 then abs(t.amount) else 0 end)::numeric as total_credit_amount,
    sum(t.amount)::numeric as net_amount
  from public.transactions t
  where t.analysis_work_item_id is not null
  group by t.analysis_work_item_id
) r on r.analysis_work_item_id = awi.id;

-- 6) Grants
grant select on public.analysis_work_items to anon, authenticated, service_role;
grant insert, update, delete on public.analysis_work_items to authenticated, service_role;
grant select on public.analysis_work_items_full to anon, authenticated, service_role;

-- Delete guard: disallow deleting items that have transactions
create or replace function public.guard_delete_awi_if_used()
returns trigger
language plpgsql
security definer
set search_path = public as $$
begin
  if exists (
    select 1 from public.transactions t
    where t.analysis_work_item_id = old.id
    limit 1
  ) then
    raise exception 'Cannot delete analysis work item because it is referenced by transactions' using errcode = '23503';
  end if;
  return old;
end;$$;

drop trigger if exists trg_guard_delete_awi_if_used on public.analysis_work_items;
create trigger trg_guard_delete_awi_if_used
  before delete on public.analysis_work_items
  for each row execute function public.guard_delete_awi_if_used();

-- 7) RPC: suggest unique code within org
create or replace function public.analysis_work_items_suggest_code(
  p_org_id uuid,
  p_name text
) returns text
language plpgsql
security definer
set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_has_org_memberships boolean := to_regclass('public.org_memberships') is not null;
  v_base text;
  v_candidate text;
  v_n int := 0;
  v_dummy int;
begin
  if p_org_id is not null and v_role <> 'service_role' then
    if v_uid is null then raise exception 'Unauthorized' using errcode = '28000'; end if;
    if v_has_org_memberships then
      perform 1 from public.org_memberships m where m.user_id = v_uid and m.org_id = p_org_id;
      if not found then raise exception 'Forbidden' using errcode = '42501'; end if;
    end if;
  end if;

  v_base := upper(regexp_replace(coalesce(p_name, ''), '[^[:alnum:]]+', '_', 'g'));
  v_base := regexp_replace(v_base, '^_+|_+$', '', 'g');
  if v_base = '' then v_base := 'ANALYSIS'; end if;
  v_candidate := v_base;

  loop
    select 1 into v_dummy from public.analysis_work_items awi
    where awi.org_id = p_org_id and awi.code = v_candidate limit 1;
    if not found then return v_candidate; end if;
    v_n := v_n + 1;
    v_candidate := v_base || '_' || v_n::text;
  end loop;
end;$$;

grant execute on function public.analysis_work_items_suggest_code(uuid, text) to authenticated, service_role;

-- 8) RPC: list by org with optional filters (project via transactions)
create or replace function public.list_analysis_work_items(
  p_org_id uuid,
  p_only_with_tx boolean default false,
  p_project_id uuid default null,
  p_search text default null,
  p_include_inactive boolean default true
) returns setof public.analysis_work_items_full
language plpgsql
security definer
set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_has_org_memberships boolean := to_regclass('public.org_memberships') is not null;
begin
  if v_role <> 'service_role' then
    if v_uid is null then raise exception 'Unauthorized' using errcode = '28000'; end if;
    if v_has_org_memberships then
      perform 1 from public.org_memberships m where m.user_id = v_uid and m.org_id = p_org_id;
      if not found then raise exception 'Forbidden' using errcode = '42501'; end if;
    end if;
  end if;

  return query
  with filtered as (
    select f.* from public.analysis_work_items_full f
    where f.org_id = p_org_id
      and (p_include_inactive or f.is_active = true)
      and (p_search is null or p_search = ''
           or f.code ilike ('%'||p_search||'%')
           or f.name ilike ('%'||p_search||'%')
           or f.name_ar ilike ('%'||p_search||'%'))
  ), with_project as (
    select ff.* from filtered ff
    where coalesce(p_project_id, '00000000-0000-0000-0000-000000000000'::uuid) = '00000000-0000-0000-0000-000000000000'::uuid
      or exists (
        select 1 from public.transactions t
        where t.org_id = ff.org_id
          and t.analysis_work_item_id = ff.id
          and (p_project_id is null or t.project_id = p_project_id)
      )
  )
  select * from with_project
  where (not p_only_with_tx) or has_transactions
  order by code;
end;$$;

grant execute on function public.list_analysis_work_items(uuid, boolean, uuid, text, boolean) to authenticated, service_role;

commit;