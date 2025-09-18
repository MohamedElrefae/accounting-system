-- 20250918_fix_approval_inbox_filter_submitted.sql
-- Purpose: Option A (filter-based) — Ensure approvals inbox only shows requests for transactions currently 'submitted'.
-- This adds a predicate on transactions.approval_status in list_approval_inbox and ensures the status index exists.
-- Idempotent and safe for repeated runs.

BEGIN;

-- Ensure helpful index exists (also defined in earlier migrations, kept here idempotently)
CREATE INDEX IF NOT EXISTS idx_transactions_approval_status
  ON public.transactions (approval_status);

-- Update RPC: filter to submitted transactions only
CREATE OR REPLACE FUNCTION public.list_approval_inbox(p_user_id uuid)
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
  submitted_at timestamptz
) LANGUAGE sql STABLE AS $$
  SELECT
    r.id AS request_id,
    r.target_id AS transaction_id,
    t.entry_number,
    t.entry_date,
    t.amount,
    t.description,
    r.org_id,
    r.workflow_id,
    r.current_step_order,
    s.name AS step_name,
    s.approver_type,
    s.approver_role_id,
    s.approver_user_id,
    r.submitted_by,
    r.submitted_at
  FROM public.approval_requests r
  JOIN public.transactions t ON t.id = r.target_id
  JOIN public.approval_steps s
    ON s.workflow_id = r.workflow_id
   AND s.step_order = r.current_step_order
  WHERE r.status = 'pending'
    AND t.approval_status = 'submitted'  -- Option A guard
    AND (
      (s.approver_type = 'user' AND s.approver_user_id = p_user_id)
      OR (s.approver_type = 'role' AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = p_user_id
              AND ur.role_id = s.approver_role_id
              AND ur.is_active = TRUE
          ))
      OR (s.approver_type = 'org_manager' AND EXISTS (
            SELECT 1 FROM public.org_memberships m
            WHERE m.user_id = p_user_id
              AND m.org_id = r.org_id
              AND m.role = 'manager'
          ))
    )
  ORDER BY r.submitted_at DESC
$$;

COMMIT;
