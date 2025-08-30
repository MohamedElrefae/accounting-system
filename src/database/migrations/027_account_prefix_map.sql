-- 027_account_prefix_map.sql
-- Creates a tiny configurable mapping to classify account codes by numeric prefixes

create table if not exists public.account_prefix_map (
  id uuid primary key default gen_random_uuid(),
  prefix text not null, -- e.g., '11', '22', '3'
  account_group text not null check (account_group in ('assets','liabilities','equity','revenue','expenses')),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Simple upsert of sensible defaults for your chart
insert into public.account_prefix_map (prefix, account_group, description)
values
 ('11','assets','Non-current assets'),
 ('12','assets','Current assets'),
 ('21','equity','Equity'),
 ('22','liabilities','Non-current liabilities'),
 ('23','liabilities','Current liabilities'),
 ('3','revenue','Revenues'),
 ('4','expenses','Expenses')
on conflict do nothing;

-- Helpful index for prefix lookups
create index if not exists idx_account_prefix_map_prefix on public.account_prefix_map (prefix);

-- Basic grants (adjust as needed)
grant select on public.account_prefix_map to anon, authenticated;
