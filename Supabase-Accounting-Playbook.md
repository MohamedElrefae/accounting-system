# Supabase Accounting Schema and Ledger Playbook

This playbook consolidates all finalized SQL blocks to set up an enterprise-grade chart of accounts, double-entry ledger, reporting helpers, and Row Level Security (RLS) in Supabase. Every executable section includes:
- SQL to run in Supabase (copy/paste)
- Verification SQL to confirm results

Follow sections in order for the smoothest setup. If you have already run a section, you can skip it or re-run safely where noted.


## 1) Accounts: Hierarchical Chart of Accounts (ltree)

SQL to run in Supabase (copy/paste)
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
  -- Derived from category (no contra_equity)
  normal_balance normal_side generated always as (
    case
      when category in ('asset','expense','contra_liability','contra_revenue') then 'debit'::normal_side
      else 'credit'::normal_side
    end
  ) stored,
  is_postable boolean not null default true,
  parent_id uuid null references public.accounts(id) on delete restrict,
  level int not null default 1,
  path ltree not null,
  status account_status not null default 'active',
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint accounts_code_unique_per_org unique (org_id, code),
  constraint accounts_no_self_parent check (parent_id is null or parent_id <> id)
);

-- Helper to normalize code into a valid ltree label
create or replace function public._ltree_label_from_code(p_code text)
returns ltree language sql immutable as $$
  select text2ltree(regexp_replace(lower(p_code), '[^a-z0-9_]+', '_', 'g'))
$$;

-- Trigger function to maintain path and level, prevent cycles, same-org parent
create or replace function public.accounts_biu_set_path_level()
returns trigger
language plpgsql
as $func$
declare
  v_parent record;
  v_label ltree;
begin
  if TG_OP = 'UPDATE' then
    new.updated_at := now();
  end if;

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

    -- Prevent cycles
    if TG_OP = 'UPDATE' and old.id is not null then
      if exists (
        select 1 from public.accounts p
        where p.id = new.parent_id and p.path <@ old.path
      ) then
        raise exception 'Cannot set parent to a descendant (cycle prevention)';
      end if;
    end if;

    new.level := v_parent.level + 1;
    new.path  := v_parent.path || v_label;
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

-- Optional: prevent changing org_id if children exist
create or replace function public.accounts_prevent_org_change_if_children()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.org_id <> new.org_id then
    if exists (select 1 from public.accounts c where c.parent_id = old.id) then
      raise exception 'Cannot change org_id on a parent account';
    end if;
  end if;
  return new;
end$$;

drop trigger if exists trg_accounts_prevent_org_change_if_children on public.accounts;
create trigger trg_accounts_prevent_org_change_if_children
before update of org_id on public.accounts
for each row execute function public.accounts_prevent_org_change_if_children();

-- Performance indexes
create index if not exists idx_accounts_org on public.accounts(org_id);
create index if not exists idx_accounts_parent on public.accounts(parent_id);
create index if not exists idx_accounts_path_gist on public.accounts using gist (path);
create index if not exists idx_accounts_path_btree on public.accounts using btree (path);
create index if not exists idx_accounts_org_code on public.accounts(org_id, code);
```

Verification SQL (copy/paste)
```sql path=null start=null
select
  to_regclass('public.accounts') as accounts_table,
  (select exists(select 1 from pg_extension where extname='ltree')) as has_ltree,
  (select exists(select 1 from pg_type where typname='account_category')) as has_account_category,
  (select exists(select 1 from pg_type where typname='normal_side')) as has_normal_side;

select column_name, is_generated, generation_expression
from information_schema.columns
where table_schema='public' and table_name='accounts' and column_name='normal_balance';
```


## 2) Seed a Default Chart of Accounts

SQL to run in Supabase (copy/paste)
```sql path=null start=null
-- Replace with your real org id (no braces)
with params as (select '00000000-0000-0000-0000-000000000001'::uuid as org_id)
-- Root accounts
insert into public.accounts (org_id, code, name, category, is_postable, parent_id, description)
select org_id, '1000', 'Assets',      'asset'::account_category,     false, null::uuid, 'All company assets'      from params
union all
select org_id, '2000', 'Liabilities', 'liability'::account_category, false, null::uuid, 'All company liabilities' from params
union all
select org_id, '3000', 'Equity',      'equity'::account_category,    false, null::uuid, 'Owners equity'           from params
union all
select org_id, '4000', 'Revenue',     'revenue'::account_category,   false, null::uuid, 'Income accounts'         from params
union all
select org_id, '5000', 'Expenses',    'expense'::account_category,   false, null::uuid, 'Operating expenses'      from params
on conflict (org_id, code) do nothing;

-- Assets subtree
with params as (select '00000000-0000-0000-0000-000000000001'::uuid as org_id)
insert into public.accounts (org_id, code, name, category, is_postable, parent_id, description)
values
  ((select org_id from params), '1100', 'Current Assets', 'asset'::account_category, false,
    (select id from public.accounts where org_id=(select org_id from params) and code='1000'), 'Liquid assets'),
  ((select org_id from params), '1110', 'Cash and Cash Equivalents', 'asset'::account_category, true,
    (select id from public.accounts where org_id=(select org_id from params) and code='1100'), 'Cash on hand and banks'),
  ((select org_id from params), '1120', 'Accounts Receivable', 'asset'::account_category, true,
    (select id from public.accounts where org_id=(select org_id from params) and code='1100'), 'Trade receivables'),
  ((select org_id from params), '1200', 'Fixed Assets', 'asset'::account_category, false,
    (select id from public.accounts where org_id=(select org_id from params) and code='1000'), 'Long-term assets'),
  ((select org_id from params), '1211', 'Machinery and Equipment', 'asset'::account_category, true,
    (select id from public.accounts where org_id=(select org_id from params) and code='1200'), 'Construction machinery and tools'),
  ((select org_id from params), '1290', 'Accumulated Depreciation', 'contra_asset'::account_category, true,
    (select id from public.accounts where org_id=(select org_id from params) and code='1200'), 'Contra account for depreciation')
on conflict (org_id, code) do nothing;

-- Liabilities subtree
with params as (select '00000000-0000-0000-0000-000000000001'::uuid as org_id)
insert into public.accounts (org_id, code, name, category, is_postable, parent_id, description)
values
  ((select org_id from params), '2100', 'Current Liabilities', 'liability'::account_category, false,
    (select id from public.accounts where org_id=(select org_id from params) and code='2000'), 'Short-term obligations'),
  ((select org_id from params), '2110', 'Accounts Payable', 'liability'::account_category, true,
    (select id from public.accounts where org_id=(select org_id from params) and code='2100'), 'Trade payables')
on conflict (org_id, code) do nothing;

-- Equity subtree
with params as (select '00000000-0000-0000-0000-000000000001'::uuid as org_id)
insert into public.accounts (org_id, code, name, category, is_postable, parent_id, description)
values
  ((select org_id from params), '3100', 'Owners Equity', 'equity'::account_category, false,
    (select id from public.accounts where org_id=(select org_id from params) and code='3000'), 'Owner capital'),
  ((select org_id from params), '3110', 'Retained Earnings', 'equity'::account_category, true,
    (select id from public.accounts where org_id=(select org_id from params) and code='3100'), 'Cumulative retained earnings')
on conflict (org_id, code) do nothing;

-- Revenue subtree
with params as (select '00000000-0000-0000-0000-000000000001'::uuid as org_id)
insert into public.accounts (org_id, code, name, category, is_postable, parent_id, description)
values
  ((select org_id from params), '4100', 'Sales Revenue', 'revenue'::account_category, true,
    (select id from public.accounts where org_id=(select org_id from params) and code='4000'), 'Primary sales revenue'),
  ((select org_id from params), '4900', 'Sales Returns and Discounts', 'contra_revenue'::account_category, true,
    (select id from public.accounts where org_id=(select org_id from params) and code='4000'), 'Contra revenue for returns/discounts')
on conflict (org_id, code) do nothing;

-- Expenses subtree
with params as (select '00000000-0000-0000-0000-000000000001'::uuid as org_id)
insert into public.accounts (org_id, code, name, category, is_postable, parent_id, description)
values
  ((select org_id from params), '5100', 'Cost of Goods Sold', 'expense'::account_category, true,
    (select id from public.accounts where org_id=(select org_id from params) and code='5000'), 'COGS / project direct costs'),
  ((select org_id from params), '5200', 'Salaries Expense', 'expense'::account_category, true,
    (select id from public.accounts where org_id=(select org_id from params) and code='5000'), 'Payroll wages and salaries'),
  ((select org_id from params), '5300', 'Rent Expense', 'expense'::account_category, true,
    (select id from public.accounts where org_id=(select org_id from params) and code='5000'), 'Office/yard rent'),
  ((select org_id from params), '5310', 'Construction Materials', 'expense'::account_category, true,
    (select id from public.accounts where org_id=(select org_id from params) and code='5100'), 'Materials for construction projects')
on conflict (org_id, code) do nothing;
```

Verification SQL (copy/paste)
```sql path=null start=null
with params as (select '00000000-0000-0000-0000-000000000001'::uuid as org_id)
select count(*) filter (where parent_id is null) as roots, count(*) as total_accounts
from public.accounts where org_id = (select org_id from params);

with params as (select '00000000-0000-0000-0000-000000000001'::uuid as org_id)
select code, name, category, is_postable, level, path::text as path
from public.accounts where org_id = (select org_id from params)
order by path;
```


## 3) Account Posting Hygiene: Parents Not Postable When Children Exist

SQL to run in Supabase (copy/paste)
```sql path=null start=null
-- Prevent setting is_postable=true when children exist
create or replace function public.accounts_prevent_postable_if_children()
returns trigger language plpgsql as $$
begin
  if new.is_postable then
    if exists (select 1 from public.accounts c where c.parent_id = new.id) then
      raise exception 'Cannot set is_postable=true on an account that has children';
    end if;
  end if;
  return new;
end$$;

drop trigger if exists trg_accounts_prevent_postable_if_children on public.accounts;
create trigger trg_accounts_prevent_postable_if_children
before update of is_postable on public.accounts
for each row execute function public.accounts_prevent_postable_if_children();

-- Auto-toggle parent postable on child add/remove
create or replace function public.accounts_child_after_write()
returns trigger language plpgsql as $$
begin
  if tg_op in ('INSERT','UPDATE') and new.parent_id is not null then
    update public.accounts set is_postable = false, updated_at = now()
    where id = new.parent_id and is_postable = true;
  end if;
  return null;
end$$;

drop trigger if exists trg_accounts_child_after_write on public.accounts;
create trigger trg_accounts_child_after_write
after insert or update of parent_id on public.accounts
for each row execute function public.accounts_child_after_write();

create or replace function public.accounts_child_after_delete()
returns trigger language plpgsql as $$
begin
  if old.parent_id is not null then
    update public.accounts p
    set is_postable = true, updated_at = now()
    where p.id = old.parent_id
      and not exists (select 1 from public.accounts c where c.parent_id = p.id);
  end if;
  return null;
end$$;

drop trigger if exists trg_accounts_child_after_delete on public.accounts;
create trigger trg_accounts_child_after_delete
after delete on public.accounts
for each row execute function public.accounts_child_after_delete();
```

Verification SQL (copy/paste)
```sql path=null start=null
begin;
select gen_random_uuid() as org into temporary t_org;
insert into public.accounts (org_id, code, name, category, is_postable)
select org, '9000', 'Test Header', 'asset'::account_category, true from t_org;
insert into public.accounts (org_id, code, name, category, is_postable, parent_id)
select org, '9010', 'Test Child', 'asset'::account_category, true,(select id from public.accounts where code='9000' and org_id=org) from t_org;
select code, is_postable from public.accounts where code in ('9000','9010') and org_id=(select org from t_org) order by code;
rollback;
```


## 4) Ledger: Journal Entries and Lines (Double-entry)

SQL to run in Supabase (copy/paste)
```sql path=null start=null
-- Enum for journal status
do $$
begin
  if not exists (select 1 from pg_type where typname = 'journal_status') then
    create type journal_status as enum ('draft','posted','void');
  end if;
end$$;

-- Journal entries header
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  entry_no bigserial,
  description text,
  status journal_status not null default 'draft',
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_journal_entries_org on public.journal_entries(org_id);
create index if not exists idx_journal_entries_status on public.journal_entries(status);
create index if not exists idx_journal_entries_posted_at on public.journal_entries(posted_at);

-- Lines
create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  org_id uuid not null,
  account_id uuid not null references public.accounts(id) on delete restrict,
  description text,
  side normal_side not null,
  amount_minor bigint not null check (amount_minor > 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_journal_lines_entry on public.journal_lines(entry_id);
create index if not exists idx_journal_lines_account on public.journal_lines(account_id);
create index if not exists idx_journal_lines_org on public.journal_lines(org_id);

-- Touch updated_at on entries
create or replace function public._je_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists trg_je_touch on public.journal_entries;
create trigger trg_je_touch before update on public.journal_entries
for each row execute function public._je_touch_updated_at();

-- Enforce line.org_id matches entry.org_id
create or replace function public._jl_enforce_org_match()
returns trigger language plpgsql as $$
declare v_org uuid;
begin
  select org_id into v_org from public.journal_entries where id = new.entry_id;
  if v_org is null then raise exception 'journal_entries % does not exist', new.entry_id; end if;
  if new.org_id <> v_org then raise exception 'journal_lines.org_id (%) must match journal_entries.org_id (%)', new.org_id, v_org; end if;
  return new;
end$$;

drop trigger if exists trg_jl_enforce_org on public.journal_lines;
create trigger trg_jl_enforce_org before insert or update of org_id, entry_id
on public.journal_lines for each row execute function public._jl_enforce_org_match();

-- Enforce account belongs to same org
create or replace function public._jl_enforce_account_org()
returns trigger language plpgsql as $$
declare v_entry_org uuid; v_acct_org uuid;
begin
  select org_id into v_entry_org from public.journal_entries where id = new.entry_id;
  select org_id into v_acct_org from public.accounts where id = new.account_id;
  if v_acct_org is null then raise exception 'Account % does not exist', new.account_id; end if;
  if v_entry_org <> v_acct_org then raise exception 'Account org (%) must match entry org (%)', v_acct_org, v_entry_org; end if;
  return new;
end$$;

drop trigger if exists trg_jl_enforce_account_org on public.journal_lines;
create trigger trg_jl_enforce_account_org before insert or update of account_id
on public.journal_lines for each row execute function public._jl_enforce_account_org();

-- Enforce entry balanced on post
create or replace function public._je_enforce_balanced()
returns trigger language plpgsql as $$
declare v_debits bigint; v_credits bigint;
begin
  if new.status = 'posted' then
    select coalesce(sum(case when side='debit' then amount_minor else 0 end),0),
           coalesce(sum(case when side='credit' then amount_minor else 0 end),0)
    into v_debits, v_credits
    from public.journal_lines where entry_id = new.id;
    if v_debits <> v_credits then
      raise exception 'Entry % not balanced: debits % != credits %', new.id, v_debits, v_credits;
    end if;
    if new.posted_at is null then new.posted_at := now(); end if;
  end if;
  return new;
end$$;

drop trigger if exists trg_je_enforce_balanced on public.journal_entries;
create constraint trigger trg_je_enforce_balanced
after insert or update of status on public.journal_entries
deferrable initially deferred
for each row execute function public._je_enforce_balanced();

-- Optional uniqueness for (org_id, entry_no)
create unique index if not exists uq_journal_entries_org_entryno
on public.journal_entries(org_id, entry_no);
```

Verification SQL (copy/paste)
```sql path=null start=null
begin;
-- Insert a balanced draft and post it to verify constraints
with org as (select org_id from public.accounts limit 1),
entry as (
  insert into public.journal_entries(org_id, description, status)
  select org_id, 'Ledger smoke', 'draft' from org returning id, org_id
),
debit as (
  select a.id as account_id from public.accounts a, entry e
  where a.org_id = e.org_id and a.is_postable = true order by a.code limit 1
),
credit as (
  select a.id as account_id from public.accounts a, entry e, debit d
  where a.org_id = e.org_id and a.is_postable = true and a.id <> d.account_id order by a.code limit 1
)
insert into public.journal_lines(entry_id, org_id, account_id, side, amount_minor, description)
select e.id, e.org_id, d.account_id, 'debit'::normal_side, 10000, 'Smoke debit' from entry e, debit d
union all
select e.id, e.org_id, c.account_id, 'credit'::normal_side, 10000, 'Smoke credit' from entry e, credit c;

update public.journal_entries set status='posted' where id in (select id from entry);

select e.id as entry_id, e.status, sum(case when l.side='debit' then l.amount_minor else 0 end) debits,
       sum(case when l.side='credit' then l.amount_minor else 0 end) credits
from public.journal_entries e join public.journal_lines l on l.entry_id = e.id
where e.id in (select id from entry)
group by e.id, e.status;
rollback;
```


## 5) Posting Protections (Lock Posted Entries and Lines)

SQL to run in Supabase (copy/paste)
```sql path=null start=null
-- Prevent changing org_id on entries
create or replace function public._je_prevent_org_change()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.org_id <> new.org_id then
    raise exception 'Cannot change org_id of a journal entry';
  end if;
  return new;
end$$;

drop trigger if exists trg_je_prevent_org_change on public.journal_entries;
create trigger trg_je_prevent_org_change before update of org_id on public.journal_entries
for each row execute function public._je_prevent_org_change();

-- Prevent edits to posted entries (except status->void)
create or replace function public._je_prevent_edit_when_posted()
returns trigger language plpgsql as $$
begin
  if old.status = 'posted' and tg_op = 'UPDATE' then
    if new.status = 'void' then return new; end if;
    raise exception 'Cannot modify a posted journal entry (except to void)';
  end if;
  return new;
end$$;

drop trigger if exists trg_je_prevent_edit_when_posted on public.journal_entries;
create trigger trg_je_prevent_edit_when_posted before update on public.journal_entries
for each row execute function public._je_prevent_edit_when_posted();

-- Prevent line mutations when posted
create or replace function public._jl_prevent_mutation_when_posted()
returns trigger language plpgsql as $$
declare v_status journal_status;
begin
  select status into v_status from public.journal_entries where id = coalesce(new.entry_id, old.entry_id);
  if v_status = 'posted' then
    raise exception 'Cannot modify lines of a posted journal entry';
  end if;
  return coalesce(new, old);
end$$;

drop trigger if exists trg_jl_prevent_insert_when_posted on public.journal_lines;
drop trigger if exists trg_jl_prevent_update_when_posted on public.journal_lines;
drop trigger if exists trg_jl_prevent_delete_when_posted on public.journal_lines;

create trigger trg_jl_prevent_insert_when_posted before insert on public.journal_lines
for each row execute function public._jl_prevent_mutation_when_posted();
create trigger trg_jl_prevent_update_when_posted before update on public.journal_lines
for each row execute function public._jl_prevent_mutation_when_posted();
create trigger trg_jl_prevent_delete_when_posted before delete on public.journal_lines
for each row execute function public._jl_prevent_mutation_when_posted();
```

Verification SQL (copy/paste)
```sql path=null start=null
begin;
-- Create a draft entry with two lines, post, then attempt an edit (should fail)
with org as (select org_id from public.accounts limit 1),
entry as (
  insert into public.journal_entries(org_id, description, status)
  select org_id, 'Post-lock test', 'draft' from org returning id, org_id
),
debit as (
  select id as account_id from public.accounts a, entry e
  where a.org_id=e.org_id and a.is_postable = true order by a.code limit 1
),
credit as (
  select id as account_id from public.accounts a, entry e, debit d
  where a.org_id=e.org_id and a.is_postable = true and a.id <> d.account_id order by a.code limit 1
)
insert into public.journal_lines(entry_id, org_id, account_id, side, amount_minor, description)
select e.id, e.org_id, d.account_id, 'debit'::normal_side, 10000, 'Lock debit' from entry e, debit d
union all
select e.id, e.org_id, c.account_id, 'credit'::normal_side, 10000, 'Lock credit' from entry e, credit c;

update public.journal_entries set status='posted' where id in (select id from entry);

-- Attempt edit
do $$
declare v_line uuid;
begin
  select id into v_line from public.journal_lines order by created_at desc limit 1;
  begin
    update public.journal_lines set amount_minor = amount_minor + 1 where id = v_line;
  exception when others then
    raise notice 'Expected failure: %', sqlerrm;
  end;
end$$;
rollback;
```


## 6) Reporting: Current Balances, As-of, Subtree, Trial Balance

SQL to run in Supabase (copy/paste)
```sql path=null start=null
-- Current balances view (posted only)
create or replace view public.v_account_balances_current as
with sums as (
  select e.org_id, l.account_id,
         sum(case when l.side='debit' then l.amount_minor else 0 end) as debits_minor,
         sum(case when l.side='credit' then l.amount_minor else 0 end) as credits_minor
  from public.journal_entries e
  join public.journal_lines l on l.entry_id = e.id
  where e.status = 'posted'
  group by e.org_id, l.account_id
)
select a.org_id, a.id as account_id, a.code, a.name, a.category, a.normal_balance, a.is_postable,
       coalesce(s.debits_minor,0) debits_minor, coalesce(s.credits_minor,0) credits_minor,
       coalesce(s.debits_minor,0) - coalesce(s.credits_minor,0) as balance_signed_minor,
       case when a.normal_balance='debit'
            then coalesce(s.debits_minor,0) - coalesce(s.credits_minor,0)
            else coalesce(s.credits_minor,0) - coalesce(s.debits_minor,0)
       end as balance_natural_minor
from public.accounts a
left join sums s on s.org_id = a.org_id and s.account_id = a.id;

-- As-of balances function (posted only)
create or replace function public.get_account_balances_as_of(p_org_id uuid, p_as_of timestamptz)
returns table (
  account_id uuid, code text, name text, normal_balance normal_side,
  balance_signed_minor bigint, balance_natural_minor bigint
) language sql stable as $$
  with sums as (
    select l.account_id,
           sum(case when l.side='debit' then l.amount_minor else 0 end) as debits_minor,
           sum(case when l.side='credit' then l.amount_minor else 0 end) as credits_minor
    from public.journal_entries e
    join public.journal_lines l on l.entry_id = e.id
    where e.status='posted' and e.org_id = p_org_id and e.posted_at <= p_as_of
    group by l.account_id
  )
  select a.id, a.code, a.name, a.normal_balance,
         coalesce(s.debits_minor,0) - coalesce(s.credits_minor,0) as balance_signed_minor,
         case when a.normal_balance='debit'
              then coalesce(s.debits_minor,0) - coalesce(s.credits_minor,0)
              else coalesce(s.credits_minor,0) - coalesce(s.debits_minor,0)
         end as balance_natural_minor
  from public.accounts a
  left join sums s on s.account_id = a.id
  where a.org_id = p_org_id
  order by a.path
$$;

-- Subtree balance function (as-of posted only)
create or replace function public.get_subtree_balance_as_of(p_org_id uuid, p_root_code text, p_as_of timestamptz)
returns table (code text, name text, level int, balance_signed_minor bigint, balance_natural_minor bigint)
language sql stable as $$
  with root as (
    select path from public.accounts where org_id=p_org_id and code=p_root_code limit 1
  ), acct as (
    select a.* from public.accounts a, root where a.org_id=p_org_id and a.path <@ root.path
  ), sums as (
    select l.account_id,
           sum(case when l.side='debit' then l.amount_minor else 0 end) as debits_minor,
           sum(case when l.side='credit' then l.amount_minor else 0 end) as credits_minor
    from public.journal_entries e
    join public.journal_lines l on l.entry_id = e.id
    where e.status='posted' and e.org_id = p_org_id and e.posted_at <= p_as_of
    group by l.account_id
  )
  select a.code, a.name, a.level,
         coalesce(s.debits_minor,0) - coalesce(s.credits_minor,0) as balance_signed_minor,
         case when a.normal_balance='debit'
              then coalesce(s.debits_minor,0) - coalesce(s.credits_minor,0)
              else coalesce(s.credits_minor,0) - coalesce(s.debits_minor,0)
         end as balance_natural_minor
  from acct a left join sums s on s.account_id = a.id
  order by a.path
$$;

-- Trial balance (current, posted only)
create or replace view public.v_trial_balance_current as
with base as (
  select a.org_id, a.id as account_id, a.code, a.name, a.normal_balance,
         coalesce(sum(case when l.side='debit' then l.amount_minor else 0 end),0) as debits_minor,
         coalesce(sum(case when l.side='credit' then l.amount_minor else 0 end),0) as credits_minor
  from public.accounts a
  left join public.journal_lines l on l.account_id = a.id
  left join public.journal_entries e on e.id = l.entry_id and e.status='posted'
  group by a.org_id, a.id, a.code, a.name, a.normal_balance
)
select org_id, account_id, code, name,
       case when debits_minor >= credits_minor then debits_minor - credits_minor else 0 end as debit_column_minor,
       case when credits_minor >  debits_minor then credits_minor - debits_minor else 0 end as credit_column_minor
from base
order by code;
```

Verification SQL (copy/paste)
```sql path=null start=null
with org as (select org_id from public.journal_entries where status='posted' limit 1)
select * from public.v_account_balances_current where org_id = (select org_id from org) order by code limit 20;

with org as (select org_id from public.journal_entries where status='posted' limit 1)
select * from public.get_account_balances_as_of((select org_id from org), now()) limit 20;

with org as (select org_id from public.journal_entries where status='posted' limit 1)
select * from public.get_subtree_balance_as_of((select org_id from org), '1000', now()) limit 50;

with org as (select org_id from public.journal_entries where status='posted' limit 1)
select * from public.v_trial_balance_current where org_id = (select org_id from org) order by code limit 50;
```


## 7) Snapshots: Balance Snapshots and Period Helpers

SQL to run in Supabase (copy/paste)
```sql path=null start=null
create table if not exists public.account_balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  as_of timestamptz not null,
  debits_minor bigint not null default 0,
  credits_minor bigint not null default 0,
  balance_signed_minor bigint not null default 0,
  balance_natural_minor bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (org_id, account_id, as_of)
);
create index if not exists idx_abs_org_asof on public.account_balance_snapshots(org_id, as_of);
create index if not exists idx_abs_org_account on public.account_balance_snapshots(org_id, account_id);

create or replace function public._compute_balances_as_of(p_org_id uuid, p_as_of timestamptz)
returns table (account_id uuid, debits_minor bigint, credits_minor bigint, balance_signed_minor bigint, balance_natural_minor bigint)
language sql stable as $$
  with sums as (
    select l.account_id,
           sum(case when l.side='debit' then l.amount_minor else 0 end) as debits_minor,
           sum(case when l.side='credit' then l.amount_minor else 0 end) as credits_minor
    from public.journal_entries e
    join public.journal_lines l on l.entry_id = e.id
    where e.status = 'posted' and e.org_id = p_org_id and e.posted_at <= p_as_of
    group by l.account_id
  )
  select a.id,
         coalesce(s.debits_minor,0), coalesce(s.credits_minor,0),
         coalesce(s.debits_minor,0) - coalesce(s.credits_minor,0) as balance_signed_minor,
         case when a.normal_balance = 'debit'
              then coalesce(s.debits_minor,0) - coalesce(s.credits_minor,0)
              else coalesce(s.credits_minor,0) - coalesce(s.debits_minor,0)
         end as balance_natural_minor
  from public.accounts a left join sums s on s.account_id = a.id
  where a.org_id = p_org_id
$$;

create or replace function public.snapshot_balances_as_of(p_org_id uuid, p_as_of timestamptz)
returns void language plpgsql as $$
begin
  insert into public.account_balance_snapshots(
    org_id, account_id, as_of, debits_minor, credits_minor, balance_signed_minor, balance_natural_minor
  )
  select p_org_id, t.account_id, p_as_of, t.debits_minor, t.credits_minor, t.balance_signed_minor, t.balance_natural_minor
  from public._compute_balances_as_of(p_org_id, p_as_of) t
  on conflict (org_id, account_id, as_of) do update
  set debits_minor = excluded.debits_minor,
      credits_minor = excluded.credits_minor,
      balance_signed_minor = excluded.balance_signed_minor,
      balance_natural_minor = excluded.balance_natural_minor;
end$$;

create or replace function public.snapshot_balances_month_end(p_org_id uuid, p_year int, p_month int)
returns void language plpgsql as $$
declare v_as_of timestamptz; begin
  v_as_of := (make_timestamptz(p_year, p_month, 1, 23, 59, 59) + interval '1 month - 1 second');
  perform public.snapshot_balances_as_of(p_org_id, v_as_of);
end$$;

-- Trial balance from snapshots
create or replace view public.v_trial_balance_snapshots as
select s.org_id, s.account_id, a.code, a.name, s.as_of,
       case when s.balance_signed_minor >= 0 then s.balance_signed_minor else 0 end as debit_column_minor,
       case when s.balance_signed_minor <  0 then -s.balance_signed_minor else 0 end as credit_column_minor,
       s.balance_natural_minor
from public.account_balance_snapshots s
join public.accounts a on a.id = s.account_id
order by s.org_id, s.as_of, a.code;
```

Verification SQL (copy/paste)
```sql path=null start=null
with org as (select org_id from public.accounts limit 1)
select public.snapshot_balances_as_of((select org_id from org), now());

with org as (select org_id from public.accounts limit 1)
select as_of, count(*) accounts_snapshotted
from public.account_balance_snapshots
where org_id = (select org_id from org)
group by as_of
order by as_of desc
limit 3;
```


## 8) General Ledger View (Running Balances)

SQL to run in Supabase (copy/paste)
```sql path=null start=null
create or replace view public.v_general_ledger as
select a.org_id, a.id as account_id, a.code as account_code, a.name as account_name, a.normal_balance,
       e.id as entry_id, e.entry_no, e.posted_at,
       l.id as line_id, l.description as line_description, l.side,
       case when l.side='debit'  then l.amount_minor else 0 end as debit_minor,
       case when l.side='credit' then l.amount_minor else 0 end as credit_minor,
       (case when l.side='debit' then l.amount_minor else 0 end) - (case when l.side='credit' then l.amount_minor else 0 end) as movement_signed_minor,
       sum((case when l.side='debit' then l.amount_minor else 0 end) - (case when l.side='credit' then l.amount_minor else 0 end))
         over (partition by a.org_id, a.id order by e.posted_at, e.entry_no, l.id rows between unbounded preceding and current row) as running_signed_minor,
       sum(
         case when a.normal_balance='debit'
              then (case when l.side='debit' then l.amount_minor else 0 end) - (case when l.side='credit' then l.amount_minor else 0 end)
              else (case when l.side='credit' then l.amount_minor else 0 end) - (case when l.side='debit' then l.amount_minor else 0 end)
         end
       ) over (partition by a.org_id, a.id order by e.posted_at, e.entry_no, l.id rows between unbounded preceding and current row) as running_natural_minor
from public.journal_lines l
join public.journal_entries e on e.id = l.entry_id and e.status='posted'
join public.accounts a on a.id = l.account_id
order by a.org_id, a.code, e.posted_at, e.entry_no, l.id;
```

Verification SQL (copy/paste)
```sql path=null start=null
with org as (select org_id from public.journal_entries where status='posted' limit 1)
select * from public.v_general_ledger
where org_id = (select org_id from org)
order by account_code, posted_at, entry_no, line_id
limit 30;
```


## 9) Org-based RLS (Apply when ready)

SQL to run in Supabase (copy/paste)
```sql path=null start=null
-- Minimal org_memberships and helper
create table if not exists public.org_memberships (
  org_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('viewer','manager','admin')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists idx_org_memberships_org on public.org_memberships(org_id);
create index if not exists idx_org_memberships_user on public.org_memberships(user_id);

create or replace function public.is_org_member(p_org_id uuid, p_min_role text default 'viewer')
returns boolean language sql stable as $$
  select exists (
    select 1 from public.org_memberships m
    where m.org_id = p_org_id and m.user_id = auth.uid()
      and array_position(array['viewer','manager','admin'], m.role) >= array_position(array['viewer','manager','admin'], p_min_role)
  );
$$;

-- Enable RLS
alter table public.accounts        enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines   enable row level security;

-- Accounts policies
create policy if not exists "Accounts select by org membership"
  on public.accounts for select to authenticated using (public.is_org_member(org_id,'viewer'));
create policy if not exists "Accounts insert by managers"
  on public.accounts for insert to authenticated with check (public.is_org_member(org_id,'manager'));
create policy if not exists "Accounts update by managers"
  on public.accounts for update to authenticated using (public.is_org_member(org_id,'manager')) with check (public.is_org_member(org_id,'manager'));
create policy if not exists "Accounts delete by admins"
  on public.accounts for delete to authenticated using (public.is_org_member(org_id,'admin'));

-- Journal entries policies
create policy if not exists "JE select by org membership"
  on public.journal_entries for select to authenticated using (public.is_org_member(org_id,'viewer'));
create policy if not exists "JE write by managers"
  on public.journal_entries for all to authenticated using (public.is_org_member(org_id,'manager')) with check (public.is_org_member(org_id,'manager'));

-- Journal lines policies
create policy if not exists "JL select by org membership"
  on public.journal_lines for select to authenticated using (public.is_org_member(org_id,'viewer'));
create policy if not exists "JL write by managers"
  on public.journal_lines for all to authenticated using (public.is_org_member(org_id,'manager')) with check (public.is_org_member(org_id,'manager'));
```

Verification SQL (copy/paste)
```sql path=null start=null
-- Pick an existing auth user
create temporary table t_user as
select id as user_id from auth.users order by created_at desc limit 1;

-- Safety
do $$ begin
  if not exists (select 1 from t_user) then
    raise exception 'No users in auth.users. Create a user first.';
  end if;
end$$;

-- Create test org and membership
select gen_random_uuid() as org_id into temporary t_org;
insert into public.org_memberships(org_id, user_id, role)
select t_org.org_id, t_user.user_id, 'manager' from t_org, t_user
on conflict do nothing;

-- Simulate JWT
select set_config('request.jwt.claims', json_build_object('sub',(select user_id from t_user))::text, true);

-- Seed an account and verify visibility
insert into public.accounts(org_id, code, name, category, is_postable)
select t_org.org_id, 'T100', 'Test Account', 'asset'::account_category, true from t_org on conflict do nothing;

select a.org_id, a.code, a.name from public.accounts a where a.org_id in (select org_id from t_org);

reset all;
```


## 10) Optional: Temporary Permissive RLS (for testing)

SQL to run in Supabase (copy/paste)
```sql path=null start=null
alter table public.accounts        enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines   enable row level security;

-- Drop existing policies for a clean temp state (optional)
-- Then allow all authenticated users
create policy if not exists "temp all select" on public.accounts for select to authenticated using (true);
create policy if not exists "temp all insert" on public.accounts for insert to authenticated with check (true);
create policy if not exists "temp all update" on public.accounts for update to authenticated using (true) with check (true);
create policy if not exists "temp all delete" on public.accounts for delete to authenticated using (true);

create policy if not exists "temp je all select" on public.journal_entries for select to authenticated using (true);
create policy if not exists "temp je all write"  on public.journal_entries for all    to authenticated using (true) with check (true);

create policy if not exists "temp jl all select" on public.journal_lines   for select to authenticated using (true);
create policy if not exists "temp jl all write"  on public.journal_lines   for all    to authenticated using (true) with check (true);
```


---

# UI Integration Plan (Enterprise-grade)

The following outlines how to integrate this backend in a modern enterprise UI (React/Next.js or similar). No code yet—just a pragmatic plan.

1) Foundations
- Authentication: Supabase Auth (email, SSO) with JWT propagated to the app.
- Organization context: store selected org in app state; fetch memberships to determine role (viewer/manager/admin).
- API access: use Supabase JS client; all RLS enforced by database policies.

2) Core Screens
- Chart of Accounts
  - Tree view with expand/collapse; create/edit accounts (code, name, type, parent, is_postable).
  - Prevent making a parent postable; surface DB validation errors.
  - Search by code/name; lazy-load children using ltree subtree queries.
- Journal Entry Editor
  - Draft builder with line items (account picker limited by org via RLS).
  - Live balance indicator (sum debits vs credits); disallow post until balanced.
  - Post/void actions; block edits to posted entries per DB rules.
- General Ledger
  - Account filter, date range; fetch from v_general_ledger; show running balances.
  - Links from ledger lines to entry/detail views.
- Trial Balance / Reports
  - Current or As-of date: use get_account_balances_as_of or snapshot fallback function.
  - Export to CSV; pagination; totals checks (sum debits == sum credits for TB).

3) Components/UX
- Account Picker: searchable, hierarchical; filters to postable-only for line selection.
- Money Input: decimal to minor units conversion; localized formatting.
- Toasts/Errors: normalize PG error messages (RLS, constraints) to user-friendly text.
- Role-aware UI: hide write buttons for viewers; show disabled state with tooltip.

4) Performance
- Use pagination and server-side filters.
- For heavy reports, use snapshots views; fall back to live calculations when needed.
- Add optimistic UI for draft JE edits; rely on RLS and constraints for final safety.

5) Testing/Verification
- Seed an org and a few accounts via the seeding block.
- Run posting smoke tests (non-persistent) before shipping.
- Add end-to-end tests to verify RLS behavior for viewer vs manager.

6) Roadmap
- Branch support: add branch_id to accounts, journal tables; extend RLS to branch scope.
- Multi-currency: add currency columns and conversion; per-currency balances.
- Period close workflows: lock windows, approvals, snapshot automation.

This plan ensures clean separation of concerns: the database enforces integrity and security, and the UI remains a thin, role-aware client on top.

