-- Improve account_delete error reporting and safeguards
-- Date: 2025-08-27

create or replace function public.account_delete(
  p_org_id uuid,
  p_account_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  _has_children boolean;
begin
  -- Prevent delete if the account has children
  select exists(
    select 1 from accounts a
    where a.org_id = p_org_id and a.parent_id = p_account_id
  ) into _has_children;

  if _has_children then
    raise exception 'Cannot delete account with children'
      using errcode = 'P0001'; -- raise_exception
  end if;

  begin
    delete from accounts
    where org_id = p_org_id
      and id = p_account_id;
  exception
    when foreign_key_violation then
      -- More helpful message when there are referencing rows (e.g., transactions)
      raise exception 'Cannot delete account because it is referenced by other records (e.g., transactions)'
        using errcode = '23503';
  end;
end;
$$;

