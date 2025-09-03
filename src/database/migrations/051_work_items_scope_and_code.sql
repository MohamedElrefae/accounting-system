-- 051_work_items_scope_and_code.sql
-- Enforce parent-child project scope on work_items and provide RPC to suggest unique hierarchical codes

begin;

-- 1) Trigger function to enforce: if parent_id is set, child's org_id and project_id must match parent's
create or replace function public.enforce_work_items_parent_scope()
returns trigger
language plpgsql
security definer
set search_path = public as $$
declare
  v_parent_org uuid;
  v_parent_project uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select org_id, project_id into v_parent_org, v_parent_project
  from public.work_items
  where id = new.parent_id;

  if not found then
    raise exception 'Parent work item not found for id=%', new.parent_id using errcode = '23503';
  end if;

  if new.org_id is distinct from v_parent_org then
    raise exception 'Child org_id must equal parent org_id' using errcode = '23514';
  end if;

  if new.project_id is distinct from v_parent_project then
    raise exception 'Child project_id must equal parent project_id (or both null)' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_work_items_parent_scope on public.work_items;
create trigger trg_enforce_work_items_parent_scope
before insert or update on public.work_items
for each row execute function public.enforce_work_items_parent_scope();


-- 2) RPC to suggest a unique code based on parent + name and scope
--    Ensures uniqueness within (org_id, effective project_id)
create or replace function public.work_items_suggest_code(
  p_org_id uuid,
  p_parent_id uuid,
  p_name text,
  p_project_id uuid
)
returns text
language plpgsql
security definer
set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
  v_has_is_org_member boolean := to_regprocedure('public.is_org_member(uuid, text)') is not null;
  v_has_org_memberships boolean := to_regclass('public.org_memberships') is not null;
  v_parent_code text;
  v_scope_project uuid;
  v_base text;
  v_candidate text;
  v_n int := 0;
  v_dummy int;
begin
  -- Optional authorization: ensure caller is member of the org (if helpers exist)
  if p_org_id is not null and v_role <> 'service_role' then
    if v_uid is null then
      raise exception 'Unauthorized' using errcode = '28000';
    end if;
    if v_has_is_org_member then
      if not public.is_org_member(p_org_id, 'viewer') then
        raise exception 'Forbidden' using errcode = '42501';
      end if;
    elsif v_has_org_memberships then
      perform 1 from public.org_memberships m where m.user_id = v_uid and m.org_id = p_org_id;
      if not found then
        raise exception 'Forbidden' using errcode = '42501';
      end if;
    end if;
  end if;

  -- Determine scope and parent code
  if p_parent_id is not null then
    select code, project_id into v_parent_code, v_scope_project
    from public.work_items
    where id = p_parent_id and org_id = p_org_id;
    if not found then
      return null;
    end if;
  else
    v_scope_project := p_project_id;
    v_parent_code := null;
  end if;

  -- Build base segment from name: uppercase, non-alnum => underscore, trim underscores
  v_base := upper(regexp_replace(coalesce(p_name, ''), '[^[:alnum:]]+', '_', 'g'));
  v_base := regexp_replace(v_base, '^_+|_+$', '', 'g');
  if v_base = '' then v_base := 'ITEM'; end if;

  v_candidate := coalesce(v_parent_code || '.', '') || v_base;

  loop
    select 1 into v_dummy
    from public.work_items wi
    where wi.org_id = p_org_id
      and ((wi.project_id is null and v_scope_project is null) or wi.project_id = v_scope_project)
      and wi.code = v_candidate
    limit 1;

    if not found then
      return v_candidate;
    end if;

    v_n := v_n + 1;
    v_candidate := coalesce(v_parent_code || '.', '') || v_base || '_' || v_n::text;
  end loop;
end;
$$;

commit;

