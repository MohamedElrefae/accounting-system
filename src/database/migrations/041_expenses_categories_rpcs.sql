-- 041_expenses_categories_rpcs.sql
-- RPCs for create/update/delete/get_tree with hard delete semantics

begin;

-- create_expenses_category
create or replace function public.create_expenses_category(
  p_org_id uuid,
  p_code text,
  p_description text,
  p_add_to_cost boolean default false,
  p_parent_id uuid default null,
  p_linked_account_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
  v_id uuid := gen_random_uuid();
begin
  if v_role <> 'service_role' then
    if v_uid is null then
      raise exception 'Unauthorized: missing JWT' using errcode = '28000';
    end if;
    if not public.is_org_member(p_org_id, 'manager') then
      raise exception 'Forbidden: not a member of org' using errcode = '42501';
    end if;
  end if;

  insert into public.expenses_categories (id, org_id, parent_id, code, description, add_to_cost, is_active, linked_account_id, created_by, updated_by)
  values (v_id, p_org_id, p_parent_id, p_code, p_description, coalesce(p_add_to_cost,false), true, p_linked_account_id, v_uid, v_uid);

  return v_id;
end
$$;

-- update_expenses_category with optional clearing of linked account
create or replace function public.update_expenses_category(
  p_id uuid,
  p_code text default null,
  p_description text default null,
  p_add_to_cost boolean default null,
  p_is_active boolean default null,
  p_linked_account_id uuid default null,
  p_clear_linked_account boolean default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
  v_org uuid;
begin
  select org_id into v_org from public.expenses_categories where id = p_id;
  if v_org is null then
    raise exception 'Category not found' using errcode = 'P0002';
  end if;

  if v_role <> 'service_role' then
    if v_uid is null then
      raise exception 'Unauthorized: missing JWT' using errcode = '28000';
    end if;
    if not public.is_org_member(v_org, 'manager') then
      raise exception 'Forbidden: not a member of org' using errcode = '42501';
    end if;
  end if;

  update public.expenses_categories ec
  set
    code = coalesce(p_code, ec.code),
    description = coalesce(p_description, ec.description),
    add_to_cost = coalesce(p_add_to_cost, ec.add_to_cost),
    is_active = coalesce(p_is_active, ec.is_active),
    linked_account_id = case
      when p_clear_linked_account is true then null
      when p_linked_account_id is not null then p_linked_account_id
      else ec.linked_account_id
    end,
    updated_at = now(),
    updated_by = v_uid
  where ec.id = p_id;

  return true;
end
$$;

-- delete_expenses_category: hard delete (no soft delete). Restrict if has children.
create or replace function public.delete_expenses_category(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
  v_org uuid;
  v_has_children boolean;
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

  select exists (select 1 from public.expenses_categories c where c.parent_id = p_id) into v_has_children;
  if v_has_children then
    raise exception 'Cannot delete category with children' using errcode = 'P0001';
  end if;

  delete from public.expenses_categories where id = p_id;

  return true;
end
$$;

-- get_expenses_categories_tree
create or replace function public.get_expenses_categories_tree(p_org_id uuid)
returns table (
  id uuid,
  org_id uuid,
  parent_id uuid,
  code text,
  description text,
  add_to_cost boolean,
  is_active boolean,
  level int,
  path ltree,
  linked_account_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_uid uuid := auth.uid();
begin
  if v_role <> 'service_role' then
    if v_uid is null then
      raise exception 'Unauthorized: missing JWT' using errcode = '28000';
    end if;
    if not public.is_org_member(p_org_id, 'viewer') then
      raise exception 'Forbidden: not a member of org' using errcode = '42501';
    end if;
  end if;

  return query
    select ec.id, ec.org_id, ec.parent_id, ec.code, ec.description, ec.add_to_cost, ec.is_active, ec.level, ec.path, ec.linked_account_id
    from public.expenses_categories ec
    where ec.org_id = p_org_id
    order by ec.path;
end
$$;

commit;

