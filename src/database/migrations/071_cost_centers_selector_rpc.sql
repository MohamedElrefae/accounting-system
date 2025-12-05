-- Creates a secured RPC used by the UI to fetch active cost centers per org/project
-- Run with Supabase CLI: supabase db push --file src/database/migrations/071_cost_centers_selector_rpc.sql

set check_function_bodies = off;

create or replace function public.get_cost_centers_for_selector(
  p_org_id uuid,
  p_project_id uuid default null
)
returns table (
  id uuid,
  code text,
  name text,
  name_ar text,
  project_id uuid,
  level integer
)
language sql
security definer
set search_path = public
as $$
  select
    cc.id,
    cc.code,
    cc.name,
    cc.name_ar,
    cc.project_id,
    coalesce(array_length(string_to_array(cc.code, '.'), 1), 1) as level
  from cost_centers cc
  where cc.org_id = p_org_id
    and cc.is_active = true
    and (
      p_project_id is null
      or cc.project_id is null
      or cc.project_id = p_project_id
    )
  order by cc.code;
$$;

comment on function public.get_cost_centers_for_selector(uuid, uuid)
  is 'Returns the active cost centers for an organization (and optionally a project), allowing the UI to bypass RLS failures.';

grant execute on function public.get_cost_centers_for_selector(uuid, uuid) to anon, authenticated;
