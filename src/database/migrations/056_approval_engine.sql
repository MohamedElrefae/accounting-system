-- 056_approval_engine.sql
-- Purpose: Introduce configurable multi-step approvals for transactions while
-- preserving existing submit_transaction and review_transaction RPC contracts.
-- Idempotent: yes

-- Safety: enable needed extensions
create extension if not exists pgcrypto;

-- 1) Core tables
create table if not exists public.approval_workflows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  target_table text not null check (target_table = 'transactions'),
  is_active boolean not null default true,
  condition jsonb, -- optional: { classification_id, min_amount, max_amount }
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index if not exists idx_approval_workflows_active on public.approval_workflows(is_active) where is_active;
create index if not exists idx_approval_workflows_target on public.approval_workflows(target_table);

create table if not exists public.approval_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.approval_workflows(id) on delete cascade,
  step_order int not null check (step_order >= 1),
  name text not null,
  approver_type text not null check (approver_type in ('role','user','org_manager')), -- keep minimal for now
  approver_role_id int references public.roles(id) on delete set null,
  approver_user_id uuid references auth.users(id) on delete set null,
  required_approvals int not null default 1 check (required_approvals >= 1),
  is_final boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workflow_id, step_order)
);

create index if not exists idx_approval_steps_wf_order on public.approval_steps(workflow_id, step_order);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  target_table text not null check (target_table = 'transactions'),
  target_id uuid not null references public.transactions(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  workflow_id uuid not null references public.approval_workflows(id) on delete restrict,
  current_step_order int not null default 1,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  final_decision text check (final_decision in ('approved','rejected','cancelled')),
  final_decision_by uuid references auth.users(id) on delete set null,
  final_decision_at timestamptz,
  meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(target_table, target_id)
);

create index if not exists idx_approval_requests_status on public.approval_requests(status);
create index if not exists idx_approval_requests_actor on public.approval_requests(submitted_by);

create table if not exists public.approval_actions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.approval_requests(id) on delete cascade,
  step_order int not null,
  action text not null check (action in ('approve','reject','request_changes','comment')),
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_approval_actions_request on public.approval_actions(request_id);

-- 2) Helper: get current step for a request
create or replace view public.v_approval_request_current_step as
select r.id as request_id, r.workflow_id, r.current_step_order, s.id as step_id, s.approver_type, s.approver_role_id, s.approver_user_id, s.required_approvals, s.is_final
from public.approval_requests r
join public.approval_steps s
  on s.workflow_id = r.workflow_id and s.step_order = r.current_step_order;

-- 3) Can user approve the current step?
create or replace function public.can_user_approve_request(p_user_id uuid, p_request_id uuid)
returns boolean
language plpgsql
as $$
declare
  v_type text;
  v_role_id int;
  v_user_id uuid;
  v_org_id uuid;
  v_allowed boolean := false;
begin
  select s.approver_type, s.approver_role_id, s.approver_user_id, r.org_id
    into v_type, v_role_id, v_user_id, v_org_id
  from public.approval_requests r
  join public.approval_steps s on s.workflow_id = r.workflow_id and s.step_order = r.current_step_order
  where r.id = p_request_id;

  if v_type is null then
    return false;
  end if;

  if v_type = 'user' then
    v_allowed := (p_user_id = v_user_id);
  elsif v_type = 'role' then
    v_allowed := exists (
      select 1 from public.user_roles ur
      where ur.user_id = p_user_id and ur.role_id = v_role_id and ur.is_active = true
    );
  elsif v_type = 'org_manager' then
    -- Roleless membership: any member of the org can approve when approver_type = 'org_manager'
    v_allowed := exists (
      select 1 from public.org_memberships m
      where m.user_id = p_user_id and m.org_id = v_org_id
    );
  end if;
  return coalesce(v_allowed, false);
end;
$$;

-- 4) Inbox RPC: list pending approvals for a user
create or replace function public.list_approval_inbox(p_user_id uuid)
returns table (
  request_id uuid,
  transaction_id uuid,
  entry_number text,
  entry_date date,
  amount numeric,
  description text,
  org_id uuid,
  workflow_id uuid,
  current_step_order int,
  step_name text,
  approver_type text,
  approver_role_id int,
  approver_user_id uuid,
  submitted_by uuid,
  submitted_at timestamptz
) language sql stable as $$
  select
    r.id as request_id,
    r.target_id as transaction_id,
    t.entry_number,
    t.entry_date,
    t.amount,
    t.description,
    r.org_id,
    r.workflow_id,
    r.current_step_order,
    s.name as step_name,
    s.approver_type,
    s.approver_role_id,
    s.approver_user_id,
    r.submitted_by,
    r.submitted_at
  from public.approval_requests r
  join public.transactions t on t.id = r.target_id
  join public.approval_steps s on s.workflow_id = r.workflow_id and s.step_order = r.current_step_order
  where r.status = 'pending'
    and (
      (s.approver_type = 'user' and s.approver_user_id = p_user_id)
      or (s.approver_type = 'role' and exists (
            select 1 from public.user_roles ur where ur.user_id = p_user_id and ur.role_id = s.approver_role_id and ur.is_active = true
          ))
      or (s.approver_type = 'org_manager' and exists (
            select 1 from public.org_memberships m where m.user_id = p_user_id and m.org_id = r.org_id
          ))
    )
  order by r.submitted_at desc
$$;

-- 5) Choose a workflow for a given transaction (simplified)
create or replace function public.pick_workflow_for_transaction(p_transaction_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_org uuid;
  v_class uuid;
  v_amount numeric;
  v_wf uuid;
begin
  select org_id, classification_id, amount
    into v_org, v_class, v_amount
  from public.transactions where id = p_transaction_id;

  -- Simple pick: first active WF for org (or null org) and target_table='transactions'
  select id into v_wf
  from public.approval_workflows
  where target_table = 'transactions' and is_active = true and (org_id is null or org_id = v_org)
  order by org_id nulls first, created_at asc
  limit 1;

  return v_wf;
end;
$$;

-- 6) Ensure default workflow exists for MAIN org: step1 role=Manager, step2 role=Owner (if available)
create or replace function public.ensure_default_approval_workflow()
returns void language plpgsql as $$
begin
  -- MAIN org if exists
  perform 1 from public.organizations where code = 'MAIN';
  if not found then return; end if;

  -- Create WF if none exists
  if not exists (select 1 from public.approval_workflows where target_table='transactions' and is_active) then
    declare v_org uuid; v_wf uuid; v_mgr int; v_owner int; begin
      select id into v_org from public.organizations where code='MAIN' limit 1;
      insert into public.approval_workflows(org_id, name, target_table, is_active)
      values (v_org, 'Default Transactions Approval', 'transactions', true)
      returning id into v_wf;

      select id into v_mgr from public.roles where name in ('Manager','مدير') limit 1;
      select id into v_owner from public.roles where name in ('Owner','مالك') limit 1;

      if v_mgr is not null then
        insert into public.approval_steps(workflow_id, step_order, name, approver_type, approver_role_id, required_approvals, is_final)
        values (v_wf, 1, 'Manager Review', 'role', v_mgr, 1, false);
      end if;
      if v_owner is not null then
        insert into public.approval_steps(workflow_id, step_order, name, approver_type, approver_role_id, required_approvals, is_final)
        values (v_wf, 2, 'Owner Approval', 'role', v_owner, 1, true);
      else
        -- If no owner role, mark first step final
        update public.approval_steps set is_final = true where workflow_id = v_wf and step_order = 1;
      end if;
    end;
  end if;
end;
$$;

-- 7) submit_transaction RPC (preserving signature)
create or replace function public.submit_transaction(p_transaction_id uuid, p_note text default null)
returns void
language plpgsql security definer
as $$
begin
  -- If approval request already exists, do nothing (idempotent)
  if exists (select 1 from public.approval_requests where target_table='transactions' and target_id = p_transaction_id and status='pending') then
    update public.transactions set approval_status='submitted', submitted_at=coalesce(submitted_at, now()) where id = p_transaction_id;
    return;
  end if;

  -- Pick workflow; create default if missing
  perform public.ensure_default_approval_workflow();
  declare v_wf uuid; v_org uuid; v_uid uuid; v_req uuid; begin
    select org_id into v_org from public.transactions where id = p_transaction_id;
    select auth.uid() into v_uid; -- current user if RLS in effect; may be null in dev
    select public.pick_workflow_for_transaction(p_transaction_id) into v_wf;

    if v_wf is null then
      -- Fallback: no workflow; mark approved immediately (keep old behavior)
      update public.transactions
        set approval_status='approved', reviewed_at=now(), reviewed_by=v_uid, review_action='approved'
      where id = p_transaction_id;
      -- Optionally post immediately will be done in review path; here we skip posting on submit
      return;
    end if;

    insert into public.approval_requests(target_table, target_id, org_id, workflow_id, current_step_order, status, submitted_by)
    values ('transactions', p_transaction_id, v_org, v_wf, 1, 'pending', v_uid)
    returning id into v_req;

    -- Stamp transaction submission info
    update public.transactions
      set approval_status='submitted', submitted_at=now(), submitted_by=v_uid
    where id = p_transaction_id;

    -- Audit
    insert into public.transaction_audit(id, transaction_id, action, actor_id, details, created_at)
    values (gen_random_uuid(), p_transaction_id, 'submitted', v_uid, jsonb_build_object('note', p_note), now());
  end;
end;
$$;

-- 8) review_transaction RPC (approve/revise/reject) mapped onto requests
create or replace function public.review_transaction(p_transaction_id uuid, p_action text, p_reason text default null)
returns void
language plpgsql security definer
as $$
declare
  v_req_id uuid;
  v_step int;
  v_is_final boolean;
  v_uid uuid;
  v_next_exists boolean;
begin
  select id into v_req_id from public.approval_requests
  where target_table='transactions' and target_id = p_transaction_id and status='pending'
  order by created_at desc limit 1;

  select auth.uid() into v_uid;

  if v_req_id is null then
    -- No request: fallback to legacy behavior on approve only
    if p_action = 'approve' then
      update public.transactions set approval_status='approved', reviewed_at=now(), reviewed_by=v_uid, review_action='approved' where id = p_transaction_id;
      -- post immediately (keep prior behavior)
      perform public.post_transaction(p_transaction_id, v_uid);
      insert into public.transaction_audit(id, transaction_id, action, actor_id, details, created_at)
      values (gen_random_uuid(), p_transaction_id, 'review', v_uid, jsonb_build_object('action', p_action, 'reason', p_reason), now());
    elsif p_action in ('revise','reject') then
      update public.transactions set approval_status=case when p_action='revise' then 'revision_requested' else 'rejected' end,
        reviewed_at=now(), reviewed_by=v_uid, review_action=case when p_action='revise' then 'revision_requested' else 'rejected' end, review_reason=p_reason
      where id = p_transaction_id;
      insert into public.transaction_audit(id, transaction_id, action, actor_id, details, created_at)
      values (gen_random_uuid(), p_transaction_id, 'review', v_uid, jsonb_build_object('action', p_action, 'reason', p_reason), now());
    end if;
    return;
  end if;

  -- Check permission
  if not public.can_user_approve_request(coalesce(v_uid, '00000000-0000-0000-0000-000000000000'::uuid), v_req_id) then
    raise exception 'USER_NOT_ALLOWED_FOR_STEP';
  end if;

  select current_step_order from public.approval_requests where id = v_req_id into v_step;
  select is_final from public.approval_steps where workflow_id = (select workflow_id from public.approval_requests where id = v_req_id) and step_order = v_step into v_is_final;

  if p_action = 'approve' then
    -- record action
    insert into public.approval_actions(request_id, step_order, action, actor_user_id, reason)
    values (v_req_id, v_step, 'approve', v_uid, p_reason);

    -- move to next or finalize
    select exists (
      select 1 from public.approval_steps s
      where s.workflow_id = (select workflow_id from public.approval_requests where id = v_req_id)
        and s.step_order = v_step + 1
    ) into v_next_exists;

    if v_next_exists then
      update public.approval_requests set current_step_order = v_step + 1, updated_at=now() where id = v_req_id;
    else
      -- finalize approved
      update public.approval_requests set status='approved', final_decision='approved', final_decision_by=v_uid, final_decision_at=now(), updated_at=now()
      where id = v_req_id;
      update public.transactions set approval_status='approved', reviewed_at=now(), reviewed_by=v_uid, review_action='approved' where id = p_transaction_id;
      -- post immediately (preserve existing UX)
      perform public.post_transaction(p_transaction_id, v_uid);
    end if;

  elsif p_action = 'revise' then
    insert into public.approval_actions(request_id, step_order, action, actor_user_id, reason)
    values (v_req_id, v_step, 'request_changes', v_uid, p_reason);
    update public.approval_requests set status='pending', updated_at=now() where id = v_req_id; -- stays pending, but tx flagged
    update public.transactions set approval_status='revision_requested', reviewed_at=now(), reviewed_by=v_uid, review_action='revision_requested', review_reason=p_reason where id = p_transaction_id;

  elsif p_action = 'reject' then
    insert into public.approval_actions(request_id, step_order, action, actor_user_id, reason)
    values (v_req_id, v_step, 'reject', v_uid, p_reason);
    update public.approval_requests set status='rejected', final_decision='rejected', final_decision_by=v_uid, final_decision_at=now(), updated_at=now() where id = v_req_id;
    update public.transactions set approval_status='rejected', reviewed_at=now(), reviewed_by=v_uid, review_action='rejected', review_reason=p_reason where id = p_transaction_id;
  else
    raise exception 'INVALID_ACTION %', p_action;
  end if;

  -- Audit
  insert into public.transaction_audit(id, transaction_id, action, actor_id, details, created_at)
  values (gen_random_uuid(), p_transaction_id, 'review', v_uid, jsonb_build_object('action', p_action, 'reason', p_reason), now());
end;
$$;

-- 9) Verification helpers (no-op in migration; run in SQL editor from the companion instructions)
