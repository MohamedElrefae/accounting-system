-- 047_expenses_categories_delete_v2.sql
-- Add optional guard to prevent deletion when category has transactions (v2 behavior)

begin;

create or replace function public.delete_expenses_category(
  p_id uuid,
  p_enforce_tx_guard boolean default false
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
  v_org uuid;
  v_has_children boolean;
  v_has_tx boolean := false;
  v_exists_mv boolean := to_regclass('public.mv_expenses_categories_rollups') is not null;
  v_exists_view boolean := to_regclass('public.v_expenses_categories_rollups') is not null;
begin
  select org_id into v_org from public.expenses_categories where id = p_id;
  if v_org is null then
    raise exception 'Category not found' using errcode = 'P0002';
  end if;

  if v_role <> 'service_role' then
    if v_uid is null then
      raise exception 'Unauthorized: missing JWT' using errcode = '28000';
    end if;
    if not public.is_org_member(v_org, 'admin') then
      raise exception 'Forbidden: not a member of org (admin required)' using errcode = '42501';
    end if;
  end if;

  -- Children guard (hard requirement)
  select exists (select 1 from public.expenses_categories c where c.parent_id = p_id) into v_has_children;
  if v_has_children then
    raise exception 'Cannot delete category with children' using errcode = 'P0001';
  end if;

  -- Optional transactions guard (v2 behavior, controlled by p_enforce_tx_guard)
  if coalesce(p_enforce_tx_guard, false) then
    if v_exists_mv then
      select coalesce(r.has_transactions, false) into v_has_tx
      from public.mv_expenses_categories_rollups r where r.id = p_id;
    elsif v_exists_view then
      select coalesce(r.has_transactions, false) into v_has_tx
      from public.v_expenses_categories_rollups r where r.id = p_id;
    else
      v_has_tx := false;
    end if;

    if coalesce(v_has_tx, false) then
      raise exception 'Cannot delete category with transactions' using errcode = 'P0001';
    end if;
  end if;

  delete from public.expenses_categories where id = p_id;
  return true;
end
$$;

commit;

