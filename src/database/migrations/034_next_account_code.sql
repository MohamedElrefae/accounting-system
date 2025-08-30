-- 034_next_account_code.sql
-- Provides an RPC to compute the next unique account code across an org
-- for a given parent code. Supports styles: 'dash', 'numeric', or 'auto'.
-- Safe/idempotent: CREATE OR REPLACE FUNCTION

begin;

create or replace function public.get_next_account_code(
  p_org_id uuid,
  p_parent_code text,
  p_style text default 'auto'
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_style text := lower(coalesce(p_style, 'auto'));
  v_parent record;
  v_dash_count int := 0;
  v_numeric_count int := 0;
  v_pad_len int := 1;
  v_code text;
begin
  -- Find the parent within org
  select id, org_id, code into v_parent
  from public.accounts
  where org_id = p_org_id and code = p_parent_code
  limit 1;
  if not found then
    raise exception 'Parent with code % not found in org %', p_parent_code, p_org_id;
  end if;

  -- Decide style if auto
  if v_style = 'auto' then
    select count(*) into v_dash_count
    from public.accounts a
    where a.org_id = p_org_id and a.code ~ ('^' || p_parent_code || '-\d+$');

    select count(*) into v_numeric_count
    from public.accounts a
    where a.org_id = p_org_id and a.code ~ ('^' || p_parent_code || '\d+$');

    if v_numeric_count > v_dash_count then
      v_style := 'numeric';
    else
      v_style := 'dash';
    end if;
  end if;

  if v_style = 'dash' then
    -- First free N for pattern parent-N (unique across org)
    select format('%s-%s', p_parent_code, gs.n) into v_code
    from (
      select gs
      from generate_series(1, 100000) gs
      where not exists (
        select 1 from public.accounts a
        where a.org_id = p_org_id and a.code = format('%s-%s', p_parent_code, gs.gs)
      )
      order by gs
      limit 1
    ) as gs;
    return v_code;
  else
    -- numeric style: parent + zero-padded integer; unique across org
    select greatest(coalesce(max(length(substring(a.code from length(p_parent_code)+1))), 1), 1)
      into v_pad_len
    from public.accounts a
    where a.org_id = p_org_id and a.code ~ ('^' || p_parent_code || '\d+$');

    select p_parent_code || lpad(gs.n::text, v_pad_len, '0') into v_code
    from (
      select gs
      from generate_series(1, 100000) gs
      where not exists (
        select 1 from public.accounts a
        where a.org_id = p_org_id
          and a.code ~ ('^' || p_parent_code || '\d+$')
          and (substring(a.code from length(p_parent_code)+1))::int = gs.gs
      )
      order by gs
      limit 1
    ) gs;
    return v_code;
  end if;
end;
$$;

-- Permissions
grant execute on function public.get_next_account_code(uuid, text, text) to anon, authenticated, service_role;

commit;

