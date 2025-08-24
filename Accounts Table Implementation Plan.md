# Accounts Table Implementation Plan (Supabase)

This revised plan implements an enterprise-grade hierarchical Chart of Accounts using PostgreSQL ltree for efficient tree queries and follows exactly the SQL to run in Supabase (copy/paste) plus a verification block you can run afterward.

Guiding principles:
- Hierarchical tree via ltree with fast ancestor/descendant queries.
- Clean account codes unique per organization.
- Standard categories with derived normal balance side.
- Triggers maintain path/level automatically.
- Indexes for performance. RLS and seeding are deferred to later phases.


## Execution Checklist

- [ ] Phase 1: Create schema for hierarchical accounts (run the SQL block below in Supabase)
- [ ] Phase 2: Optional seeding of a default chart of accounts (later)
- [ ] Phase 3: Optional helper functions/views (later)
- [ ] Phase 4: Optional RLS policies (later)
- [ ] Phase 5: Run verification SQL to confirm installation


## Phase 1 — SQL to run in Supabase (copy/paste)

```sql path=null start=null
-- Enable required extensions
create extension if not exists ltree;
create extension if not exists pgcrypto; -- for gen_random_uuid()

-- Account category and status enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_category') then
    create type account_category as enum (
      'asset','liability','equity','revenue','expense',
      'contra_asset','contra_liability','contra_revenue','contra_expense'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'account_status') then
    create type account_status as enum ('active','archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'normal_side') then
    create type normal_side as enum ('debit','credit');
  end if;
end$$;

-- Accounts table
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  code text not null check (length(code) between 1 and 32 and code ~ '^[0-9A-Za-z._-]+$'),
  name text not null,
  category account_category not null,
  -- Derived from category
  normal_balance normal_side generated always as (
    case
      when category in ('asset','expense','contra_liability','contra_equity','contra_revenue') then 'debit'::normal_side
      else 'credit'::normal_side
    end
  ) stored,
  is_postable boolean not null default true, -- leaf/posting account vs header
  parent_id uuid null references public.accounts(id) on delete restrict,
  level int not null default 1,
  path ltree not null,
  status account_status not null default 'active',
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Per-organization uniqueness
  constraint accounts_code_unique_per_org unique (org_id, code),

  -- Sanity checks
  constraint accounts_no_self_parent check (parent_id is null or parent_id <> id)
);

-- Helper to normalize code into a valid ltree label (lowercase, replace invalid chars with _)
create or replace function public._ltree_label_from_code(p_code text)
returns ltree language sql immutable as $$
  select text2ltree(regexp_replace(lower(p_code), '[^a-z0-9_]+', '_', 'g'))
$$;

-- Trigger function to maintain path and level, and enforce same-org parent
create or replace function public.accounts_biu_set_path_level()
returns trigger
language plpgsql
as $func$
declare
  v_parent record;
  v_label ltree;
begin
  -- Keep updated_at fresh
  if TG_OP = 'UPDATE' then
    new.updated_at := now();
  end if;

  -- Compute label from code
  v_label := public._ltree_label_from_code(new.code);

  if new.parent_id is not null then
    select id, org_id, path, level
      into v_parent
    from public.accounts
    where id = new.parent_id;

    if v_parent.id is null then
      raise exception 'Parent account % does not exist', new.parent_id;
    end if;

    if v_parent.org_id <> new.org_id then
      raise exception 'Parent account must belong to the same org';
    end if;

    new.level := v_parent.level + 1;
    new.path  := v_parent.path || v_label;
    -- Header accounts should not be postable if they have children; we only enforce when children appear via a separate check/index. Keep flexible.
  else
    new.level := 1;
    new.path  := v_label;
  end if;

  return new;
end
$func$;

drop trigger if exists trg_accounts_biu_set_path_level on public.accounts;
create trigger trg_accounts_biu_set_path_level
before insert or update of code, parent_id, org_id
on public.accounts
for each row
execute function public.accounts_biu_set_path_level();

-- Optional constraint: prevent changing org_id if children exist (safety)
create or replace function public.accounts_prevent_org_change_if_children()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.org_id <> new.org_id then
    if exists (select 1 from public.accounts c where c.parent_id = old.id) then
      raise exception 'Cannot change org_id on a parent account';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists trg_accounts_prevent_org_change_if_children on public.accounts;
create trigger trg_accounts_prevent_org_change_if_children
before update of org_id on public.accounts
for each row
execute function public.accounts_prevent_org_change_if_children();

-- Indexes for performance
create index if not exists idx_accounts_org on public.accounts(org_id);
create index if not exists idx_accounts_parent on public.accounts(parent_id);
create index if not exists idx_accounts_path_gist on public.accounts using gist (path);
create index if not exists idx_accounts_path_btree on public.accounts using btree (path);

-- Example seed (commented out) - add later if desired
-- insert into public.accounts (org_id, code, name, category, is_postable, parent_id)
-- values
--   ('00000000-0000-0000-0000-000000000001','1000','Assets','asset',false,null),
--   ('00000000-0000-0000-0000-000000000001','2000','Liabilities','liability',false,null),
--   ('00000000-0000-0000-0000-000000000001','3000','Equity','equity',false,null),
--   ('00000000-0000-0000-0000-000000000001','4000','Revenue','revenue',false,null),
--   ('00000000-0000-0000-0000-000000000001','5000','Expenses','expense',false,null);
```


## Phase 5 — Verification SQL (copy/paste after running Phase 1)

```sql path=null start=null
-- Basic existence checks
select
  to_regclass('public.accounts') as accounts_table,
  (select exists(select 1 from pg_extension where extname='ltree')) as has_ltree,
  (select exists(select 1 from pg_extension where extname='pgcrypto')) as has_pgcrypto,
  (select exists(select 1 from pg_type where typname='account_category')) as has_account_category,
  (select exists(select 1 from pg_type where typname='account_status')) as has_account_status,
  (select exists(select 1 from pg_type where typname='normal_side')) as has_normal_side;

-- Column/type sanity
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name='accounts'
order by ordinal_position;

-- Optional smoke test that does not persist (ROLLBACK at the end)
begin;

-- 1) Create a test org and parent/child accounts
select gen_random_uuid() as org into temp t_org;

insert into public.accounts(org_id, code, name, category, is_postable)
select org, '1000', 'Assets', 'asset', false from t_org;

insert into public.accounts(org_id, code, name, category, is_postable, parent_id)
select a.org_id, '1100', 'Cash and Cash Equivalents', 'asset', true, a.id
from public.accounts a
join t_org on a.org_id = t_org.org
where a.code = '1000';

-- 2) Verify level, path, and normal balance
select
  a.code, a.name, a.level, a.path::text as path, a.category, a.normal_balance
from public.accounts a
join t_org on a.org_id = t_org.org
order by a.level, a.code;

-- 3) Verify subtree query via ltree (children of 1000)
with root as (
  select path from public.accounts a
  join t_org on a.org_id = t_org.org
  where a.code='1000'
)
select a.code, a.name, a.level, a.path::text
from public.accounts a, root
where a.path <@ root.path
order by a.path;

-- 4) Ensure child level is parent level + 1
with parent_child as (
  select p.code as parent_code, c.code as child_code, p.level as pl, c.level as cl
  from public.accounts p
  join public.accounts c on c.parent_id = p.id
  join t_org on p.org_id = t_org.org and c.org_id = t_org.org
)
select *, (cl = pl + 1) as level_ok from parent_child;

-- Cleanup test data
rollback;
```


## Notes and Next Steps

- Seeding: We can add a full default chart of accounts template per org later.
- RLS: Add policies tied to your org/user model when ready.
- Constraints: Optionally enforce “non-postable if has children” and add helper views for balances.

