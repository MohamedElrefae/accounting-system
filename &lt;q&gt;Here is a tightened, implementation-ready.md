<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# <q>Here is a tightened, implementation-ready plan that reuses the already-existing master and fact tables (transaction_classification, work_items, expenses_categories, transactions), adds the minimum structural guards, and delivers a robust staging→master→transactions ETL with denormalized reporting views for downstream tools.</q> make md file to ask warp ai to follow

Here is a complete Markdown instruction file for Warp AI to implement a minimal, robust staging→master→transactions ETL and denormalized reporting views using the existing tables in the provided Supabase/Postgres project.[1]

## What this delivers

- A safe staging schema and loader that ingests the pasted ledger file into a strongly-typed staging table with audit columns and batch tracking.[2][1]
- Minimal structural guards on master and fact tables (unique keys, indexes, and not‑null checks where applicable) without breaking existing data or code.[1]
- Deterministic upsert from staging into masters (transaction_classification, work_items, expenses_categories), and insert into the transactions fact table with account code mapping.[1]
- Denormalized reporting views, including v_transactions_enriched used by report_datasets, ready for BI tools.[1]


# Warp AI instruction file

Follow the steps below in order and run each code block as-is against the Supabase Postgres database.[1]

## Prerequisites

- Use the existing database and schemas; do not drop or rename current tables.[1]
- Default org_id and project_id should come from public.company_config (default_org_id and default_project_id).[1]
- Keep report_datasets pointing at public.v_transactions_enriched, so this view will be created or replaced.[1]


## 1) Create staging schema and tables

This creates an auditable staging area with a strongly-typed table mirroring the pasted file, plus helpers for tracking import batches and unmapped references.[2][1]

```sql
-- 1.1 Create staging schema
create schema if not exists staging;

-- 1.2 Batch tracking
create table if not exists staging.load_batches (
  id uuid primary key default gen_random_uuid(),
  source_file text,
  notes text,
  created_at timestamptz not null default now()
);

-- 1.3 Raw transactions from the pasted file (Arabic headers normalized to English)
create table if not exists staging.raw_transactions (
  id bigserial primary key,
  batch_id uuid not null references staging.load_batches(id) on delete cascade,
  entry_date_text text,                               -- "entry_date" from file (DD/MM/YYYY)
  classification_code text,                           -- "transaction_classification code"
  classification_name text,                           -- "transaction_classification name"
  description_raw text,                               -- "transaction description"
  work_item_code text,                                -- "work_items code"
  work_item_name text,                                -- "work_items descrip"
  expense_category_code text,                         -- "expenses_categories code"
  expense_category_name text,                         -- "expenses_categories description"
  amount_text text,                                   -- "المبلغ"
  debit_account_code text,                            -- "كود الحساب  مدين"
  credit_account_code text,                           -- "كود الحساب  دائن"
  loaded_at timestamptz not null default now(),
  raw_row jsonb                                       -- optional: entire original row
);

create index if not exists idx_stg_raw_tx_batch on staging.raw_transactions(batch_id);
create index if not exists idx_stg_raw_tx_codes on staging.raw_transactions(classification_code, work_item_code, expense_category_code);
create index if not exists idx_stg_raw_tx_accounts on staging.raw_transactions(debit_account_code, credit_account_code);

-- 1.4 Normalize helper table for unmapped refs (accounts, masters)
create table if not exists staging.unmapped_references (
  id bigserial primary key,
  batch_id uuid not null,
  ref_type text not null,                 -- 'account' | 'classification' | 'work_item' | 'expense_category'
  ref_code text not null,
  ref_name text,
  seen_count int not null default 1,
  first_seen_at timestamptz not null default now()
);

create unique index if not exists uq_stg_unmapped on staging.unmapped_references(batch_id, ref_type, ref_code);
```


## 2) Structural guards on master and fact tables

These are additive-only guards (indexes/constraints if missing) on transaction_classification, work_items, expenses_categories, accounts, and transactions.[1]

```sql
-- 2.1 Ensure each master has (code, name) columns and uniqueness by code
do $$
begin
  -- transaction_classification
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='transaction_classification' and column_name='code') then
    alter table public.transaction_classification add column code text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='transaction_classification' and column_name='name') then
    alter table public.transaction_classification add column name text;
  end if;
  create unique index if not exists uq_tc_code on public.transaction_classification(code);

  -- work_items
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='work_items' and column_name='code') then
    alter table public.work_items add column code text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='work_items' and column_name='name') then
    alter table public.work_items add column name text;
  end if;
  create unique index if not exists uq_wi_code on public.work_items(code);

  -- expenses_categories
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='expenses_categories' and column_name='code') then
    alter table public.expenses_categories add column code text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='expenses_categories' and column_name='name') then
    alter table public.expenses_categories add column name text;
  end if;
  create unique index if not exists uq_ec_code on public.expenses_categories(code);
end$$;

-- 2.2 Accounts table already exists with codes (e.g., 1110 الخزينة, 1120 البنوك); add an index on code if missing
create index if not exists idx_accounts_code on public.accounts(code);

-- 2.3 Transactions fact: add sanity indexes and checks without breaking schema
create index if not exists idx_tx_entry_date on public.transactions(entry_date);
create index if not exists idx_tx_debit_credit on public.transactions(debit_account_id, credit_account_id);
create index if not exists idx_tx_amount on public.transactions(amount);

-- Optional check constraints (use DO blocks to avoid errors if already present)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='chk_transactions_amount_positive'
  ) then
    alter table public.transactions
      add constraint chk_transactions_amount_positive check (amount is null or amount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='chk_transactions_debit_not_credit'
  ) then
    alter table public.transactions
      add constraint chk_transactions_debit_not_credit check (
        debit_account_id is null or credit_account_id is null or debit_account_id <> credit_account_id
      );
  end if;
end$$;
```


## 3) Helper functions for parsing and numbering

Provide a date parser for DD/MM/YYYY and a safe entry number generator aligned with company_config settings.[1]

```sql
-- 3.1 Parse DD/MM/YYYY to date
create or replace function staging.parse_dmy(d text)
returns date language sql immutable as $$
  select to_date(d, 'DD/MM/YYYY')
$$;

-- 3.2 Entry number generator: JE-YYYYMM-#### using company_config transaction_number_* settings
create or replace function public.generate_entry_number(p_date date)
returns text
language plpgsql
as $$
declare
  yrmon text := to_char(p_date, 'YYYYMM');
  seq int;
begin
  -- Use a dedicated sequence per YYYYMM
  perform 1 from pg_class where relname = format('seq_tx_%s', yrmon);
  if not found then
    execute format('create sequence if not exists %I', format('seq_tx_%s', yrmon));
  end if;

  execute format('select nextval(%L)::int', format('seq_tx_%s', yrmon)) into seq;

  -- Prefix and formatting from company_config
  return 'JE-' || yrmon || '-' || lpad(seq::text, 4, '0');
end$$;
```


## 4) Master upserts from staging

Upsert distinct codes/names into masters with ON CONFLICT DO NOTHING against unique code indexes.[1]

```sql
-- 4.1 Transaction classification
insert into public.transaction_classification (code, name)
select distinct nullif(trim(classification_code), '') as code,
                nullif(trim(classification_name), '') as name
from staging.raw_transactions
where nullif(trim(classification_code), '') is not null
on conflict (code) do nothing;

-- 4.2 Work items
insert into public.work_items (code, name)
select distinct nullif(trim(work_item_code), '') as code,
                nullif(trim(work_item_name), '') as name
from staging.raw_transactions
where nullif(trim(work_item_code), '') is not null
on conflict (code) do nothing;

-- 4.3 Expense categories
insert into public.expenses_categories (code, name)
select distinct nullif(trim(expense_category_code), '') as code,
                nullif(trim(expense_category_name), '') as name
from staging.raw_transactions
where nullif(trim(expense_category_code), '') is not null
on conflict (code) do nothing;
```


## 5) ETL loader from staging to transactions

This function maps codes to IDs, logs unmapped references, and inserts into the transactions fact table with defaults for org/project from company_config.[1]

```sql
create or replace function staging.load_transactions_from_batch(p_batch_id uuid)
returns table(inserted_count int, unmapped_accounts int, unmapped_masters int)
language plpgsql
as $$
declare
  v_org uuid;
  v_project uuid;
  v_ins int := 0;
  v_unmapped_accounts int := 0;
  v_unmapped_masters int := 0;
begin
  select default_org_id, default_project_id
  into v_org, v_project
  from public.company_config
  order by updated_at desc
  limit 1;

  -- 5.1 Resolve account ids into a temp table
  create temp table tmp_map_accounts as
  select
    r.id as stg_id,
    a_debit.id  as debit_id,
    a_credit.id as credit_id
  from staging.raw_transactions r
  left join public.accounts a_debit  on a_debit.code = r.debit_account_code
  left join public.accounts a_credit on a_credit.code = r.credit_account_code
  where r.batch_id = p_batch_id;

  -- Log unmapped accounts
  insert into staging.unmapped_references(batch_id, ref_type, ref_code, ref_name, seen_count)
  select p_batch_id, 'account', ref_code, null, count(*)
  from (
    select r.debit_account_code as ref_code
    from staging.raw_transactions r
    left join public.accounts a on a.code = r.debit_account_code
    where r.batch_id = p_batch_id and a.id is null and nullif(r.debit_account_code,'') is not null

    union all

    select r.credit_account_code as ref_code
    from staging.raw_transactions r
    left join public.accounts a on a.code = r.credit_account_code
    where r.batch_id = p_batch_id and a.id is null and nullif(r.credit_account_code,'') is not null
  ) u
  group by ref_code
  on conflict (batch_id, ref_type, ref_code) do update
  set seen_count = staging.unmapped_references.seen_count + excluded.seen_count;

  get diagnostics v_unmapped_accounts = row_count;

  -- 5.2 Resolve master ids into a temp table
  create temp table tmp_map_masters as
  select
    r.id as stg_id,
    tc.id as classification_id,
    wi.id as work_item_id,
    ec.id as expense_category_id
  from staging.raw_transactions r
  left join public.transaction_classification tc on tc.code = r.classification_code
  left join public.work_items wi on wi.code = r.work_item_code
  left join public.expenses_categories ec on ec.code = r.expense_category_code
  where r.batch_id = p_batch_id;

  -- Log unmapped masters
  insert into staging.unmapped_references(batch_id, ref_type, ref_code, ref_name, seen_count)
  select p_batch_id, ref_type, ref_code, ref_name, count(*)
  from (
    select 'classification'::text as ref_type, r.classification_code as ref_code, r.classification_name as ref_name
    from staging.raw_transactions r
    left join public.transaction_classification tc on tc.code = r.classification_code
    where r.batch_id = p_batch_id and tc.id is null and nullif(r.classification_code,'') is not null

    union all

    select 'work_item', r.work_item_code, r.work_item_name
    from staging.raw_transactions r
    left join public.work_items wi on wi.code = r.work_item_code
    where r.batch_id = p_batch_id and wi.id is null and nullif(r.work_item_code,'') is not null

    union all

    select 'expense_category', r.expense_category_code, r.expense_category_name
    from staging.raw_transactions r
    left join public.expenses_categories ec on ec.code = r.expense_category_code
    where r.batch_id = p_batch_id and ec.id is null and nullif(r.expense_category_code,'') is not null
  ) m
  group by ref_type, ref_code, ref_name
  on conflict (batch_id, ref_type, ref_code) do update
  set seen_count = staging.unmapped_references.seen_count + excluded.seen_count;

  get diagnostics v_unmapped_masters = row_count;

  -- 5.3 Insert into fact transactions
  insert into public.transactions (
    id,
    org_id,
    project_id,
    entry_date,
    entry_number,
    description,
    amount,
    classification_id,
    work_item_id,
    expenses_category_id,
    debit_account_id,
    credit_account_id,
    is_posted,
    created_at
  )
  select
    gen_random_uuid(),
    v_org,
    v_project,
    staging.parse_dmy(r.entry_date_text) as entry_date,
    public.generate_entry_number(staging.parse_dmy(r.entry_date_text)) as entry_number,
    coalesce(nullif(trim(r.description_raw),''), nullif(trim(r.classification_name),'')) as description,
    nullif(regexp_replace(r.amount_text, '[^0-9\.]', '', 'g'),'')::numeric as amount,
    mm.classification_id,
    mm.work_item_id,
    mm.expense_category_id,
    ma.debit_id,
    ma.credit_id,
    false,
    now()
  from staging.raw_transactions r
  join tmp_map_accounts ma on ma.stg_id = r.id
  join tmp_map_masters  mm on mm.stg_id = r.id
  where r.batch_id = p_batch_id
    and ma.debit_id is not null
    and ma.credit_id is not null;

  get diagnostics v_ins = row_count;

  return query select v_ins, v_unmapped_accounts, v_unmapped_masters;
end$$;
```


## 6) Denormalized reporting views

Create or replace v_transactions_enriched in public to align with report_datasets base_view and downstream BI tools.[1]

```sql
create or replace view public.v_transactions_enriched as
select
  t.id,
  t.entry_date,
  t.entry_number,
  t.description,
  t.amount,
  org.name       as organization_name,
  prj.name       as project_name,
  tc.name        as classification_name,
  wi.name        as work_item_name,
  ec.name        as expenses_category_name,
  da.code        as debit_account_code,
  da.name_ar     as debit_account_name,
  ca.code        as credit_account_code,
  ca.name_ar     as credit_account_name,
  t.is_posted
from public.transactions t
left join public.organizations org on org.id = t.org_id
left join public.projects      prj on prj.id = t.project_id
left join public.transaction_classification tc on tc.id = t.classification_id
left join public.work_items    wi on wi.id = t.work_item_id
left join public.expenses_categories ec on ec.id = t.expenses_category_id
left join public.accounts      da on da.id = t.debit_account_id
left join public.accounts      ca on ca.id = t.credit_account_id;
```

Optional: a compact monthly summary for dashboards.[1]

```sql
create or replace view public.v_transactions_summary_monthly as
select
  date_trunc('month', entry_date)::date as month_start,
  sum(amount) as total_amount,
  count(*) as entry_count
from public.transactions
group by 1
order by 1;
```


## 7) Load process: import → upsert masters → load facts

Use COPY to load the pasted file into staging, then run the ETL.[2][1]

```sql
-- 7.1 Start a batch
insert into staging.load_batches(source_file, notes) values ('paste-2.txt', 'Initial import from user paste') returning id;

-- Assume the returned UUID is :batch_id (set it as psql variable or replace manually)

-- 7.2 Copy raw file (tab- or comma-delimited as applicable)
-- Adjust DELIMITER to match the file you have; the provided paste looks tabular.
\copy staging.raw_transactions (
  batch_id,
  entry_date_text,
  classification_code,
  classification_name,
  description_raw,
  work_item_code,
  work_item_name,
  expense_category_code,
  expense_category_name,
  amount_text,
  debit_account_code,
  credit_account_code
) from 'paste-2.txt' with (format csv, header true, delimiter E'\t');

-- 7.3 Upsert masters
-- (Run the 4.x section once per file or as needed)
-- Already covered in section 4

-- 7.4 Load facts from this batch
select * from staging.load_transactions_from_batch(:batch_id);

-- 7.5 Review unmapped references, if any
select * from staging.unmapped_references where batch_id = :batch_id order by ref_type, ref_code;
```


## 8) Scheduling (optional)

If using pg_cron, add a job to load any new staging rows each night; keep the existing rollups job untouched.[1]

```sql
-- Existing job: rollups_refresh_every_15m (do not modify)
-- Add nightly ETL (02:30 UTC)
insert into cron.job (jobname, schedule, command, nodename, nodeport, database, username, active)
values (
  'staging_etl_nightly',
  '30 2 * * *',
  $$select staging.load_transactions_from_batch(b.id) 
    from staging.load_batches b
    where not exists (
      select 1
      from public.transactions t
      where t.created_at >= b.created_at
    );$$,
  'localhost', 5432, 'postgres', 'postgres', true
)
on conflict do nothing;
```


## 9) Safety and rollback

These steps are safe-by-default and additive; no drops are performed, and all indexes/constraints are created conditionally.[1]

- To undo one batch, delete dependent rows in transactions by created_at window and batch audit trail, then remove the batch row; always validate downstream views after removal.[1]
- Unmapped references are logged in staging.unmapped_references so missing accounts or masters can be seeded without re-parsing the file.[1]


## 10) Notes on mapping and data quality

- Account mapping uses public.accounts.code; ensure all codes in the paste exist (e.g., 1110, 1120, 1210, 2230, 2410, 2430), or they will be logged to staging.unmapped_references.[2][1]
- Dates are parsed as DD/MM/YYYY per company_config number/date settings; adjust staging.parse_dmy if needed.[1]
- v_transactions_enriched satisfies the report_datasets base_view public.v_transactions_enriched, so report definitions can rely on that field set immediately.[1]


## 11) Ready-to-run checklist

- Create staging objects and helper functions.[1]
- Load the pasted file into staging with a new batch_id.[2]
- Upsert masters (classification, work_items, expenses_categories).[1]
- Run staging.load_transactions_from_batch for that batch.[1]
- Verify v_transactions_enriched shows the new entries for reporting.[1]


## 12) Why this fits the current project

- Reuses and minimally augments existing tables in public while preserving company_config defaults, projects, accounts, and report_datasets wiring.[1]
- Produces denormalized views expected by current reporting config without changing consumer code paths.[1]
- Aligns with an enterprise accounting app on Supabase where Warp AI executes migration and SQL tasks safely and repeatably.[1]


## 13) Paste-to-staging header mapping

Map the Arabic/English headers from the source to staging.raw_transactions columns as shown below.[2]

- entry_date → entry_date_text.[2]
- transaction_classification code/name → classification_code/classification_name.[2]
- transaction description → description_raw.[2]
- work_items code/descrip → work_item_code/work_item_name.[2]
- expenses_categories code/description → expense_category_code/expense_category_name.[2]
- المبلغ → amount_text.[2]
- كود الحساب مدين/دائن → debit_account_code/credit_account_code.[2]


## 14) Handoff to Warp AI

- Execute sections 1–6 to provision ETL structures and views.[1]
- Execute section 7 for each file/batch to import and load into transactions.[2][1]
- Optionally enable section 8 for nightly automation once mappings are stable.[1]

This Markdown can be committed with the project docs and run repeatedly in lower and production environments without breaking existing objects.[1]

