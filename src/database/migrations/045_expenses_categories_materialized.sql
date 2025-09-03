-- 045_expenses_categories_materialized.sql
-- Optional materialized rollups for Expenses Categories with a refresh function

begin;

-- Create or replace MV from the view (simple approach). For CONCURRENTLY, an index is required; we use plain refresh for v1.
create materialized view if not exists public.mv_expenses_categories_rollups as
select * from public.v_expenses_categories_rollups
with no data;

-- Helpful index for lookups by id
create index if not exists ix_mv_exp_cat_rollups_id on public.mv_expenses_categories_rollups(id);

-- Refresh helper
create or replace function public.refresh_expenses_categories_rollups()
returns void
language sql
security definer
set search_path = public
as $$
  refresh materialized view public.mv_expenses_categories_rollups;
$$;

-- Initial populate (optional): comment out if you prefer to control timing
-- select public.refresh_expenses_categories_rollups();

grant select on public.mv_expenses_categories_rollups to anon, authenticated, service_role;

commit;

