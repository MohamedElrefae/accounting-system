-- 039_expenses_categories_core.sql
-- Core schema for Expenses Categories with hard delete semantics and audit fields (no soft delete)

begin;

create extension if not exists pgcrypto;
create extension if not exists ltree;

create table if not exists public.expenses_categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  parent_id uuid null references public.expenses_categories(id) on delete restrict,
  code text not null,
  description text not null,
  add_to_cost boolean not null default false,
  is_active boolean not null default true,
  level int not null default 1 check (level between 1 and 4),
  path ltree not null,
  linked_account_id uuid null references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id),
  updated_by uuid null references auth.users(id)
);

-- Unique code per org
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='ux_expenses_categories_org_code'
  ) then
    create unique index ux_expenses_categories_org_code on public.expenses_categories(org_id, code);
  end if;
end $$;

-- Helper: compute ltree label (fallback if _ltree_label_from_code is absent)
create or replace function public._ec_label_from_code(p_code text)
returns ltree
language sql
immutable
as $$
  select case
    when to_regprocedure('public._ltree_label_from_code(text)') is not null
    then (select public._ltree_label_from_code(p_code))
    else text2ltree(regexp_replace(lower(coalesce(p_code,'')), '[^a-z0-9_]+', '_', 'g'))
  end
$$;

-- Trigger to maintain level, path, audit
create or replace function public.expenses_categories_biu_set_path_level()
returns trigger
language plpgsql
as $func$
declare
  v_parent_level int;
  v_parent_path ltree;
begin
  if TG_OP = 'UPDATE' then
    new.updated_at := now();
    new.updated_by := auth.uid();
  else
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := coalesce(new.updated_at, now());
    new.created_by := coalesce(new.created_by, auth.uid());
    new.updated_by := coalesce(new.updated_by, auth.uid());
  end if;

  if new.parent_id is null then
    new.level := 1;
    new.path  := public._ec_label_from_code(new.code);
  else
    -- Parent must exist in same org
    select level, path into v_parent_level, v_parent_path
    from public.expenses_categories p
    where p.id = new.parent_id and p.org_id = new.org_id
    limit 1;
    if v_parent_level is null then
      raise exception 'Parent category not found in same org';
    end if;

    -- Prevent cycles on update
    if TG_OP = 'UPDATE' and old.id is not null then
      if exists (select 1 from public.expenses_categories p where p.id = new.parent_id and p.path <@ old.path) then
        raise exception 'Cannot set parent to a descendant (cycle prevention)';
      end if;
    end if;

    new.level := v_parent_level + 1;
    new.path  := v_parent_path || public._ec_label_from_code(new.code);
    if new.level > 4 then
      raise exception 'Max depth (4) exceeded';
    end if;
  end if;

  return new;
end
$func$;

drop trigger if exists trg_expenses_categories_biu_set_path_level on public.expenses_categories;
create trigger trg_expenses_categories_biu_set_path_level
before insert or update of code, parent_id, org_id
on public.expenses_categories
for each row execute function public.expenses_categories_biu_set_path_level();

-- Supporting indexes
do $$
begin
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='ix_expense_cat_org') then
    create index ix_expense_cat_org on public.expenses_categories(org_id);
  end if;
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='ix_expense_cat_parent') then
    create index ix_expense_cat_parent on public.expenses_categories(parent_id);
  end if;
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='ix_expense_cat_path') then
    create index ix_expense_cat_path on public.expenses_categories using gist(path);
  end if;
end $$;

commit;

