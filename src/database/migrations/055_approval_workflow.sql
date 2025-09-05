-- 055_approval_workflow.sql
-- Adds approval workflow fields and review_transaction RPC for transactions.
-- Safe/idempotent where possible.

begin;

-- 1) Add approval workflow columns to transactions if not exist
alter table public.transactions
  add column if not exists approval_status text not null default 'draft' check (approval_status in ('draft','submitted','approved','rejected','revision_requested','cancelled')),
  add column if not exists submitted_at timestamptz,
  add column if not exists submitted_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid,
  add column if not exists review_action text check (review_action in ('approved','rejected','revision_requested')),
  add column if not exists review_reason text;

-- 2) Ensure index to speed up pending lists
create index if not exists ix_transactions_approval_status on public.transactions(approval_status);

-- 3) Extend permissions with transactions.review (schema-agnostic)
DO $$
BEGIN
  -- name_ar present?
  PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='permissions' AND column_name='name_ar';
  IF FOUND THEN
    -- resource present?
    PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='permissions' AND column_name='resource';
    IF FOUND THEN
      -- action present?
      PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='permissions' AND column_name='action';
      IF FOUND THEN
        insert into public.permissions(name, name_ar, resource, action, description)
          values ('transactions.review', 'مراجعة واعتماد المعاملات', 'transactions', 'review', 'Review transactions: approve/reject/request revision')
        on conflict (name) do nothing;
      ELSE
        insert into public.permissions(name, name_ar, resource, description)
          values ('transactions.review', 'مراجعة واعتماد المعاملات', 'transactions', 'Review transactions: approve/reject/request revision')
        on conflict (name) do nothing;
      END IF;
    ELSE
      insert into public.permissions(name, name_ar, description)
        values ('transactions.review', 'مراجعة واعتماد المعاملات', 'Review transactions: approve/reject/request revision')
      on conflict (name) do nothing;
    END IF;
  ELSE
    -- name_ar not present
    PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='permissions' AND column_name='resource';
    IF FOUND THEN
      PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='permissions' AND column_name='action';
      IF FOUND THEN
        insert into public.permissions(name, resource, action, description)
          values ('transactions.review', 'transactions', 'review', 'Review transactions: approve/reject/request revision')
        on conflict (name) do nothing;
      ELSE
        insert into public.permissions(name, resource, description)
          values ('transactions.review', 'transactions', 'Review transactions: approve/reject/request revision')
        on conflict (name) do nothing;
      END IF;
    ELSE
      insert into public.permissions(name, description)
        values ('transactions.review', 'Review transactions: approve/reject/request revision')
      on conflict (name) do nothing;
    END IF;
  END IF;
END$$;

-- 4) Allow audit table to record 'review' action as well
-- Make it idempotent: only add/replace if needed
DO $$
DECLARE
  def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO def
  FROM pg_constraint
  WHERE conrelid = 'public.transaction_audit'::regclass
    AND conname = 'transaction_audit_action_check';

  IF def IS NULL THEN
    -- Constraint not present: create it
    ALTER TABLE public.transaction_audit
      ADD CONSTRAINT transaction_audit_action_check CHECK (action in ('create','update','delete','post','review'));
  ELSE
    -- Constraint exists: ensure it includes 'review'
    IF position('review' in lower(def)) > 0 THEN
      -- Already supports 'review' -> do nothing
    ELSE
      -- Replace with the correct definition
      ALTER TABLE public.transaction_audit DROP CONSTRAINT transaction_audit_action_check;
      ALTER TABLE public.transaction_audit
        ADD CONSTRAINT transaction_audit_action_check CHECK (action in ('create','update','delete','post','review'));
    END IF;
  END IF;
END$$;

-- 5) review_transaction RPC (security definer) - approves (and posts), requests revision, or rejects
create or replace function public.review_transaction(
  p_transaction_id uuid,
  p_action text,
  p_reason text default null
) returns void
language plpgsql
security definer
as $$
begin
  if not public.has_permission(auth.uid(), 'transactions.review') then
    raise exception 'Insufficient permissions to review transactions';
  end if;

  if p_action not in ('approve','reject','revise') then
    raise exception 'Invalid action: %', p_action;
  end if;

  -- Ensure transaction exists and is not posted
  perform 1 from public.transactions where id = p_transaction_id and is_posted = false;
  if not found then
    raise exception 'Transaction not found or already posted';
  end if;

  if p_action = 'approve' then
    update public.transactions
       set approval_status = 'approved',
           reviewed_at = now(),
           reviewed_by = auth.uid(),
           review_action = 'approved',
           review_reason = p_reason,
           updated_at = now()
     where id = p_transaction_id;

    -- Audit
    insert into public.transaction_audit(transaction_id, action, actor_id, details)
    values (p_transaction_id, 'review', auth.uid(), jsonb_build_object('action','approved','reason', p_reason));

    -- Immediately post upon approval
    perform public.post_transaction(p_transaction_id, auth.uid());

  elsif p_action = 'revise' then
    update public.transactions
       set approval_status = 'revision_requested',
           reviewed_at = now(),
           reviewed_by = auth.uid(),
           review_action = 'revision_requested',
           review_reason = coalesce(p_reason, 'no reason provided'),
           updated_at = now()
     where id = p_transaction_id;

    insert into public.transaction_audit(transaction_id, action, actor_id, details)
    values (p_transaction_id, 'review', auth.uid(), jsonb_build_object('action','revision_requested','reason', p_reason));

  elsif p_action = 'reject' then
    update public.transactions
       set approval_status = 'rejected',
           reviewed_at = now(),
           reviewed_by = auth.uid(),
           review_action = 'rejected',
           review_reason = coalesce(p_reason, 'no reason provided'),
           updated_at = now()
     where id = p_transaction_id;

    insert into public.transaction_audit(transaction_id, action, actor_id, details)
    values (p_transaction_id, 'review', auth.uid(), jsonb_build_object('action','rejected','reason', p_reason));
  end if;
end;
$$;

-- 6) submit_transaction RPC: creator (or manager) submits for review
create or replace function public.submit_transaction(
  p_transaction_id uuid,
  p_note text default null
) returns void
language plpgsql
security definer
as $$
begin
  -- Only creator on unposted can submit, or managers
  if not (
    exists (
      select 1 from public.transactions t
      where t.id = p_transaction_id
        and t.is_posted = false
        and t.created_by = auth.uid()
    )
    or public.has_permission(auth.uid(), 'transactions.manage')
  ) then
    raise exception 'Insufficient permissions to submit this transaction';
  end if;

  -- Set submitted state (do not override if already submitted/approved/rejected)
  update public.transactions
     set approval_status = 'submitted',
         submitted_at = now(),
         submitted_by = auth.uid(),
         updated_at = now()
   where id = p_transaction_id
     and is_posted = false
     and (approval_status is null or approval_status in ('draft','revision_requested'));

  -- Audit as a review-type event with action 'submitted'
  insert into public.transaction_audit(transaction_id, action, actor_id, details)
  values (p_transaction_id, 'review', auth.uid(), jsonb_build_object('action','submitted','note', p_note));
end;
$$;

commit;

