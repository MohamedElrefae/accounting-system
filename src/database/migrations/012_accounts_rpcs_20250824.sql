-- Accounts RPCs: toggle, update, insert child, delete
-- Created: 2025-08-24

-- Toggle account status between 'active' and 'inactive'
create or replace function public.toggle_account_status(
  p_org_id uuid,
  p_account_id uuid
) returns json language plpgsql security definer as $$
declare
  v_current text;
  v_new text;
begin
  select status into v_current
  from accounts
  where org_id = p_org_id and id = p_account_id
  for update;
  if not found then
    raise exception 'Account not found';
  end if;

  v_new := case when v_current = 'active' then 'inactive' else 'active' end;

  update accounts
  set status = v_new, updated_at = now()
  where org_id = p_org_id and id = p_account_id;

  return json_build_object('id', p_account_id, 'status', v_new);
end $$;

-- Update account basic fields
create or replace function public.account_update(
  p_org_id uuid,
  p_id uuid,
  p_code text,
  p_name text,
  p_name_ar text,
  p_account_type text,
  p_level int,
  p_status text
) returns json language plpgsql security definer as $$
begin
  update accounts
  set code = coalesce(p_code, code),
      name = coalesce(p_name, name),
      name_ar = coalesce(p_name_ar, name_ar),
      category = coalesce(p_account_type, category),
      level = coalesce(p_level, level),
      status = coalesce(p_status, status),
      updated_at = now()
  where org_id = p_org_id and id = p_id;

  return (
    select json_build_object(
      'id', id,
      'code', code,
      'name', name,
      'name_ar', name_ar,
      'category', category,
      'level', level,
      'status', status,
      'parent_id', parent_id
    )
    from accounts
    where org_id = p_org_id and id = p_id
  );
end $$;

-- Insert a child account under a parent
create or replace function public.account_insert_child(
  p_org_id uuid,
  p_parent_id uuid,
  p_code text,
  p_name text,
  p_name_ar text,
  p_account_type text,
  p_level int,
  p_status text
) returns json language plpgsql security definer as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into accounts (id, org_id, parent_id, code, name, name_ar, category, level, status, created_at, updated_at)
  values (v_id, p_org_id, p_parent_id, p_code, p_name, p_name_ar, p_account_type, p_level, coalesce(p_status,'active'), now(), now());

  return (
    select json_build_object(
      'id', id,
      'code', code,
      'name', name,
      'name_ar', name_ar,
      'category', category,
      'level', level,
      'status', status,
      'parent_id', parent_id,
      'has_children', false,
      'has_active_children', false
    )
    from accounts
    where id = v_id
  );
end $$;

-- Delete an account (safeguard: prevent if children exist)
create or replace function public.account_delete(
  p_org_id uuid,
  p_account_id uuid
) returns void language plpgsql security definer as $$
begin
  if exists (select 1 from accounts a where a.org_id = p_org_id and a.parent_id = p_account_id) then
    raise exception 'Cannot delete account with children';
  end if;

  delete from accounts
  where org_id = p_org_id and id = p_account_id;
end $$;

-- Helpful indexes (no-op if they already exist)
create index if not exists idx_accounts_org_parent on accounts(org_id, parent_id);
create index if not exists idx_accounts_org_id on accounts(org_id, id);
create index if not exists idx_accounts_org_code on accounts(org_id, code);

