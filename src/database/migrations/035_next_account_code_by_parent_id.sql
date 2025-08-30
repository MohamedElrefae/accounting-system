-- 035_next_account_code_by_parent_id.sql
-- RPC wrapper: get next unique account code using parent_id instead of parent_code
-- Delegates to public.get_next_account_code to keep logic in one place

begin;

create or replace function public.get_next_account_code_by_parent_id(
  p_org_id uuid,
  p_parent_id uuid,
  p_style text default 'auto'
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_code text;
begin
  select code into v_parent_code
  from public.accounts
  where org_id = p_org_id and id = p_parent_id
  limit 1;

  if v_parent_code is null then
    raise exception 'Parent id % not found in org %', p_parent_id, p_org_id;
  end if;

  return public.get_next_account_code(p_org_id, v_parent_code, p_style);
end;
$$;

-- Permissions
grant execute on function public.get_next_account_code_by_parent_id(uuid, uuid, text)
  to anon, authenticated, service_role;

commit;

