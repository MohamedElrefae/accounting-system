-- 033_accounts_path_trigger_fix.sql
-- Ensure hierarchical path and level are always set for accounts, and backfill existing rows

begin;

-- 1) Required extension
create extension if not exists ltree;

-- 2) Helper to normalize code -> ltree label
create or replace function public._ltree_label_from_code(p_code text)
returns ltree
language sql
immutable
as $$
  select text2ltree(regexp_replace(lower(coalesce(p_code,'')), '[^a-z0-9_]+', '_', 'g'))
$$;

-- 3) BEFORE INSERT/UPDATE trigger to compute level and path from parent/code
create or replace function public.accounts_biu_set_path_level()
returns trigger
language plpgsql
as $func$
begin
  if TG_OP = 'UPDATE' then
    new.updated_at := now();
  end if;

  if new.parent_id is null then
    new.level := 1;
    new.path  := public._ltree_label_from_code(new.code);
  else
    -- Validate parent exists and is same org
    perform 1 from public.accounts p where p.id = new.parent_id and p.org_id = new.org_id;
    if not found then
      raise exception 'Parent account not found in same org';
    end if;

    -- Prevent cycles on update
    if TG_OP = 'UPDATE' and old.id is not null then
      if exists (
        select 1 from public.accounts p where p.id = new.parent_id and p.path <@ old.path
      ) then
        raise exception 'Cannot set parent to a descendant (cycle prevention)';
      end if;
    end if;

    new.level := (select level from public.accounts where id = new.parent_id) + 1;
    new.path  := (select path  from public.accounts where id = new.parent_id) || public._ltree_label_from_code(new.code);
  end if;

  return new;
end
$func$;

drop trigger if exists trg_accounts_biu_set_path_level on public.accounts;
create trigger trg_accounts_biu_set_path_level
before insert or update of code, parent_id, org_id
on public.accounts
for each row execute function public.accounts_biu_set_path_level();

-- 4) Backfill existing rows where path/level are missing or wrong
with recursive t as (
  select a.id, a.parent_id, a.code, a.org_id,
         1::int as lvl,
         public._ltree_label_from_code(a.code) as pth
  from public.accounts a
  where a.parent_id is null
  union all
  select c.id, c.parent_id, c.code, c.org_id,
         t.lvl + 1 as lvl,
         t.pth || public._ltree_label_from_code(c.code)
  from public.accounts c
  join t on t.id = c.parent_id
)
update public.accounts a
set level = t.lvl,
    path  = t.pth,
    updated_at = now()
from t
where a.id = t.id
  and (a.path is null or a.level is distinct from t.lvl);

-- 5) Simple utility view used by UI (drop and recreate to avoid column-mismatch errors)
drop view if exists public.v_accounts_tree_ui;
create view public.v_accounts_tree_ui as
select
  a.id,
  a.org_id,
  a.code,
  a.name,
  coalesce(a.name_ar, a.name) as name_ar,
  a.level,
  a.status,
  a.parent_id,
  a.category,
  a.path,
  a.path::text as path_text,
  exists (select 1 from public.accounts c where c.parent_id = a.id) as has_children,
  exists (select 1 from public.accounts c where c.parent_id = a.id and c.status = 'active') as has_active_children
from public.accounts a;

grant select on public.v_accounts_tree_ui to anon, authenticated, service_role;

-- 6) Harden account_insert_child to play nicely with trigger logic
create or replace function public.account_insert_child(
  p_org_id uuid,
  p_parent_id uuid,
  p_code text,
  p_name text,
  p_name_ar text,
  p_account_type text,
  p_level int,
  p_status text
) returns json language plpgsql security definer as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into public.accounts (id, org_id, parent_id, code, name, name_ar, category, level, status, is_postable, created_at, updated_at)
  values (v_id, p_org_id, p_parent_id, p_code, p_name, p_name_ar, p_account_type, p_level, coalesce(p_status,'active'), (coalesce(p_level,1) >= 3), now(), now());

  return (
    select json_build_object(
      'id', id,
      'code', code,
      'name', name,
      'name_ar', name_ar,
      'category', category,
      'level', level,
      'status', status,
      'parent_id', parent_id,
      'has_children', false,
      'has_active_children', false
    )
    from public.accounts
    where id = v_id
  );
end $$;

commit;

