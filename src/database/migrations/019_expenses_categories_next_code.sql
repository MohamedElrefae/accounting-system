-- 019_expenses_categories_next_code.sql
-- Server-side next code generator for expenses categories (numeric, no dashes)
-- Guarantees consistency under concurrency using advisory locks

-- Assumptions:
-- - Table: public.expenses_categories with columns: id, org_id, parent_id, code (text), level (int)
-- - org_id is UUID (adjust type if different)
-- - code is text but contains numeric-only values
-- - Depth max 4 is enforced elsewhere (triggers/constraints/UI)

begin;

create or replace function public.expenses_categories_next_code(p_org_id uuid, p_parent_id uuid)
returns text
language plpgsql
as $$
declare
  v_parent_code text;
  v_next_root bigint;
  v_suffix_max int;
  v_next_suffix int;
  v_next_code text;
  v_lock_key bigint;
  v_level int;
  v_children_count int;
begin
  -- Build a single advisory lock key based on org and parent to serialize sequence per branch
  v_lock_key := hashtextextended(p_org_id::text || ':' || coalesce(p_parent_id::text, ''), 0);
  perform pg_advisory_xact_lock(v_lock_key);

  if p_parent_id is null then
    -- Root level: next integer (max(code)::bigint + 1) for rows with no parent in same org
    select coalesce(max(code)::bigint, 0) + 1
    into v_next_root
    from public.expenses_categories ec
    where ec.org_id = p_org_id and ec.parent_id is null and ec.code ~ '^\d+$';

    v_next_code := v_next_root::text;
  else
    -- Child level: concatenate parent's code with two-digit suffix (01, 02, ...)
    -- Fetch parent code and level
    select ec.code, ec.level into v_parent_code, v_level
    from public.expenses_categories ec
    where ec.id = p_parent_id and ec.org_id = p_org_id
    limit 1;

    if v_parent_code is null then
      raise exception 'Parent % not found in org %', p_parent_id, p_org_id using errcode = 'P0002';
    end if;

    if v_level >= 3 then
      -- Max depth = 4; parent at level 3 cannot have children
      raise exception 'Max depth (4) reached under parent %', p_parent_id using errcode = 'P0001';
    end if;

    -- Determine next two-digit suffix among direct children
    -- Child code format: parent_code || lpad(N, 2, '0')
    select coalesce(max(
      nullif(substring(ec.code from (length(v_parent_code) + 1)), '')::int
    ), 0)
    into v_suffix_max
    from public.expenses_categories ec
    where ec.org_id = p_org_id
      and ec.parent_id = p_parent_id
      and ec.code ~ ('^' || v_parent_code || '\\d+$');

    v_next_suffix := v_suffix_max + 1;

    if v_next_suffix > 99 then
      raise exception 'Exceeded max children (99) under parent %', p_parent_id using errcode = 'P0001';
    end if;

    v_next_code := v_parent_code || lpad(v_next_suffix::text, 2, '0');
  end if;

  -- Double-check uniqueness (defensive)
  if exists (
    select 1 from public.expenses_categories ec
    where ec.org_id = p_org_id and ec.code = v_next_code
      and ( (p_parent_id is null and ec.parent_id is null) or (ec.parent_id = p_parent_id) )
  ) then
    raise exception 'Generated code % already exists (concurrency)', v_next_code using errcode = '23505';
  end if;

  return v_next_code;
end;
$$;

-- Expose via RPC for PostgREST/Supabase
-- Adjust security definer/rls as needed; keeping invoker by default
create or replace function public.rpc_expenses_categories_next_code(p_org_id uuid, p_parent_id uuid)
returns text
language sql
stable
as $$
  select public.expenses_categories_next_code(p_org_id, p_parent_id);
$$;

commit;

