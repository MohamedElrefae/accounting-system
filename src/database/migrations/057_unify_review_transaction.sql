-- 057_unify_review_transaction.sql
-- Purpose: Fix function overloading conflicts by creating a single unified review_transaction function
-- that works with both the approval engine and legacy workflows, accepting multiple action aliases.
-- This resolves PGRST203 errors when calling review_transaction from the UI.

begin;

-- Drop any existing review_transaction function overloads to prevent conflicts
do $$
declare
  r record;
begin
  for r in
    select pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'review_transaction'
  loop
    execute format('drop function if exists public.review_transaction(%s);', r.args);
  end loop;
end$$;

-- Create unified review_transaction function
create or replace function public.review_transaction(
  p_transaction_id uuid,
  p_action text,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req_id uuid;
  v_step int;
  v_is_final boolean;
  v_uid uuid := auth.uid();
  v_next_exists boolean;
  v_norm_action text;
begin
  -- Normalize action synonyms
  v_norm_action := lower(trim(p_action));
  if v_norm_action in ('request_changes','revise','revision_requested','request_change','changes_requested','send_back') then
    v_norm_action := 'revise';
  elsif v_norm_action in ('approve','approved') then
    v_norm_action := 'approve';
  elsif v_norm_action in ('reject','rejected') then
    v_norm_action := 'reject';
  else
    raise exception 'INVALID_ACTION %', p_action;
  end if;

  -- Disallow reviewing posted transactions
  perform 1 from public.transactions where id = p_transaction_id and coalesce(is_posted,false) = false;
  if not found then
    raise exception 'Transaction not found or already posted';
  end if;

  -- Try approval engine flow first
  select id into v_req_id
  from public.approval_requests
  where target_table = 'transactions' and target_id = p_transaction_id and status = 'pending'
  order by created_at desc
  limit 1;

  if v_req_id is null then
    -- Legacy fallback: require explicit permission to review
    if not public.has_permission(v_uid, 'transactions.review') then
      raise exception 'Insufficient permissions to review transactions';
    end if;

    if v_norm_action = 'approve' then
      update public.transactions
         set approval_status = 'approved',
             reviewed_at = now(),
             reviewed_by = v_uid,
             review_action = 'approved',
             review_reason = p_reason,
             updated_at = now()
       where id = p_transaction_id;

      insert into public.transaction_audit(transaction_id, action, actor_id, details)
      values (p_transaction_id, 'review', v_uid, jsonb_build_object('action','approved','reason', p_reason));

      perform public.post_transaction(p_transaction_id, v_uid);

    elsif v_norm_action = 'revise' then
      update public.transactions
         set approval_status = 'revision_requested',
             reviewed_at = now(),
             reviewed_by = v_uid,
             review_action = 'revision_requested',
             review_reason = coalesce(p_reason, 'no reason provided'),
             updated_at = now()
       where id = p_transaction_id;

      insert into public.transaction_audit(transaction_id, action, actor_id, details)
      values (p_transaction_id, 'review', v_uid, jsonb_build_object('action','revision_requested','reason', p_reason));

    elsif v_norm_action = 'reject' then
      update public.transactions
         set approval_status = 'rejected',
             reviewed_at = now(),
             reviewed_by = v_uid,
             review_action = 'rejected',
             review_reason = coalesce(p_reason, 'no reason provided'),
             updated_at = now()
       where id = p_transaction_id;

      insert into public.transaction_audit(transaction_id, action, actor_id, details)
      values (p_transaction_id, 'review', v_uid, jsonb_build_object('action','rejected','reason', p_reason));
    end if;

    return;
  end if;

  -- Approval engine flow
  if not public.can_user_approve_request(coalesce(v_uid, '00000000-0000-0000-0000-000000000000'::uuid), v_req_id) then
    raise exception 'USER_NOT_ALLOWED_FOR_STEP';
  end if;

  select current_step_order into v_step from public.approval_requests where id = v_req_id;
  select s.is_final into v_is_final
  from public.approval_steps s
  join public.approval_requests r on r.workflow_id = s.workflow_id and s.step_order = r.current_step_order
  where r.id = v_req_id;

  if v_norm_action = 'approve' then
    insert into public.approval_actions(request_id, step_order, action, actor_user_id, reason)
    values (v_req_id, v_step, 'approve', v_uid, p_reason);

    -- Move to next step if exists
    select exists (
      select 1 from public.approval_steps s
      where s.workflow_id = (select workflow_id from public.approval_requests where id = v_req_id)
        and s.step_order = v_step + 1
    ) into v_next_exists;

    if v_next_exists then
      update public.approval_requests
         set current_step_order = v_step + 1,
             updated_at = now()
       where id = v_req_id;
    else
      -- Finalize approved
      update public.approval_requests
         set status = 'approved',
             final_decision = 'approved',
             final_decision_by = v_uid,
             final_decision_at = now(),
             updated_at = now()
       where id = v_req_id;

      update public.transactions
         set approval_status = 'approved',
             reviewed_at = now(),
             reviewed_by = v_uid,
             review_action = 'approved'
       where id = p_transaction_id;

      -- Post immediately
      perform public.post_transaction(p_transaction_id, v_uid);
    end if;

  elsif v_norm_action = 'revise' then
    insert into public.approval_actions(request_id, step_order, action, actor_user_id, reason)
    values (v_req_id, v_step, 'request_changes', v_uid, p_reason);

    update public.approval_requests
       set status = 'pending',
           updated_at = now()
     where id = v_req_id;

    update public.transactions
       set approval_status = 'revision_requested',
           reviewed_at = now(),
           reviewed_by = v_uid,
           review_action = 'revision_requested',
           review_reason = p_reason
     where id = p_transaction_id;

  elsif v_norm_action = 'reject' then
    insert into public.approval_actions(request_id, step_order, action, actor_user_id, reason)
    values (v_req_id, v_step, 'reject', v_uid, p_reason);

    update public.approval_requests
       set status = 'rejected',
           final_decision = 'rejected',
           final_decision_by = v_uid,
           final_decision_at = now(),
           updated_at = now()
     where id = v_req_id;

    update public.transactions
       set approval_status = 'rejected',
           reviewed_at = now(),
           reviewed_by = v_uid,
           review_action = 'rejected',
           review_reason = p_reason
     where id = p_transaction_id;
  end if;

  -- Audit trail (review action)
  insert into public.transaction_audit(transaction_id, action, actor_id, details)
  values (p_transaction_id, 'review', v_uid, jsonb_build_object('action', v_norm_action, 'reason', p_reason));
end;
$$;

commit;