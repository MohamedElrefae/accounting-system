-- 070_fix_get_my_line_approvals_types.sql
-- Fixes type mismatch errors in get_my_line_approvals RPC
-- The error was: Returned type character varying(255) does not match expected type text in column 11 (org_name)

BEGIN;

CREATE OR REPLACE FUNCTION public.get_my_line_approvals(
    p_user_id uuid
)
RETURNS TABLE (
    line_id uuid,
    transaction_id uuid,
    entry_number text,
    entry_date date,
    line_no int,
    account_code text,
    account_name text,
    debit_amount numeric,
    credit_amount numeric,
    description text,
    org_name text,
    project_name text,
    cost_center_name text,
    submitted_by_email text,
    submitted_at timestamptz,
    priority text,
    hours_pending int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tl.id as line_id,
        t.id as transaction_id,
        t.entry_number::text,
        t.entry_date,
        tl.line_no,
        a.code::text as account_code,
        a.name::text as account_name,
        tl.debit_amount,
        tl.credit_amount,
        tl.description::text,
        o.name::text as org_name,
        p.name::text as project_name,
        cc.name::text as cost_center_name,
        u.email::text as submitted_by_email,
        t.submitted_at,
        'Normal'::text as priority,
        (EXTRACT(EPOCH FROM (now() - t.submitted_at))/3600)::int as hours_pending
    FROM public.transaction_lines tl
    JOIN public.transactions t ON t.id = tl.transaction_id
    JOIN public.accounts a ON a.id = tl.account_id
    LEFT JOIN public.organizations o ON o.id = t.org_id
    LEFT JOIN public.projects p ON p.id = tl.project_id
    LEFT JOIN public.cost_centers cc ON cc.id = tl.cost_center_id
    LEFT JOIN auth.users u ON u.id = t.submitted_by
    WHERE tl.line_status = 'pending'
    -- For now, show all pending lines to everyone or filter by permission if needed
    -- AND (tl.assigned_approver_id = p_user_id OR public.has_permission(p_user_id, 'transactions.review'))
    ORDER BY t.submitted_at ASC;
END;
$$;

-- Also fix list_approval_inbox_v2 which was reported as failing
-- We recreate it to ensure types match ApprovalInboxRow
CREATE OR REPLACE FUNCTION public.list_approval_inbox_v2(p_user_id uuid)
RETURNS TABLE (
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
  submitted_at timestamptz,
  status text,
  target_table text,
  target_id uuid
) LANGUAGE sql STABLE AS $$
  select
    r.id as request_id,
    r.target_id as transaction_id,
    t.entry_number::text,
    t.entry_date,
    (
      SELECT GREATEST(COALESCE(SUM(tl.debit_amount),0), COALESCE(SUM(tl.credit_amount),0))
      FROM public.transaction_lines tl
      WHERE tl.transaction_id = t.id
    ) as amount,
    t.description::text,
    r.org_id,
    r.workflow_id,
    r.current_step_order,
    s.name::text as step_name,
    s.approver_type::text,
    s.approver_role_id,
    s.approver_user_id,
    r.submitted_by,
    r.submitted_at,
    r.status::text,
    r.target_table::text,
    r.target_id
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
  order by r.submitted_at desc;
$$;

COMMIT;
