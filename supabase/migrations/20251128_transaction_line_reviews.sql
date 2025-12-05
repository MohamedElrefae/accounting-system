-- 068_transaction_line_reviews.sql
-- Adds support for line-level reviews (comments, flags, approvals)

BEGIN;

-- 1. Create transaction_line_reviews table
CREATE TABLE IF NOT EXISTS public.transaction_line_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    line_id uuid NOT NULL REFERENCES public.transaction_lines(id) ON DELETE CASCADE,
    reviewer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    review_type text NOT NULL CHECK (review_type IN ('comment', 'flag', 'approve', 'request_change', 'reject')),
    comment text,
    created_at timestamptz NOT NULL DEFAULT now(),
    approval_request_id uuid REFERENCES public.approval_requests(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_line_reviews_transaction ON public.transaction_line_reviews(transaction_id);
CREATE INDEX IF NOT EXISTS idx_line_reviews_line ON public.transaction_line_reviews(line_id);
CREATE INDEX IF NOT EXISTS idx_line_reviews_request ON public.transaction_line_reviews(approval_request_id);

-- 2. Add columns to transaction_lines
ALTER TABLE public.transaction_lines
    ADD COLUMN IF NOT EXISTS line_status text NOT NULL DEFAULT 'draft' CHECK (line_status IN ('draft', 'pending', 'approved', 'rejected', 'change_requested')),
    ADD COLUMN IF NOT EXISTS assigned_approver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_at timestamptz,
    ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

-- 3. RPC: add_line_review_comment
CREATE OR REPLACE FUNCTION public.add_line_review_comment(
    p_approval_request_id uuid,
    p_line_id uuid,
    p_reviewer_user_id uuid,
    p_comment text,
    p_review_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id uuid;
    v_review_id uuid;
BEGIN
    -- Get transaction_id from line
    SELECT transaction_id INTO v_transaction_id FROM public.transaction_lines WHERE id = p_line_id;
    
    INSERT INTO public.transaction_line_reviews (
        transaction_id,
        line_id,
        reviewer_user_id,
        review_type,
        comment,
        approval_request_id
    ) VALUES (
        v_transaction_id,
        p_line_id,
        p_reviewer_user_id,
        p_review_type,
        p_comment,
        p_approval_request_id
    ) RETURNING id INTO v_review_id;

    -- Update line status based on review type
    IF p_review_type = 'request_change' THEN
        UPDATE public.transaction_lines 
        SET line_status = 'change_requested' 
        WHERE id = p_line_id;
    ELSIF p_review_type = 'approve' THEN
        UPDATE public.transaction_lines 
        SET line_status = 'approved',
            approved_by = p_reviewer_user_id,
            approved_at = now()
        WHERE id = p_line_id;
    ELSIF p_review_type = 'reject' THEN
        UPDATE public.transaction_lines 
        SET line_status = 'rejected',
            rejected_by = p_reviewer_user_id,
            rejected_at = now()
        WHERE id = p_line_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'review_id', v_review_id, 'message', 'Review added');
END;
$$;

-- 4. RPC: get_line_reviews_for_approval
CREATE OR REPLACE FUNCTION public.get_line_reviews_for_approval(
    p_approval_request_id uuid
)
RETURNS TABLE (
    line_id uuid,
    line_no int,
    account_code text,
    account_name text,
    debit_amount numeric,
    credit_amount numeric,
    review_count bigint,
    has_change_requests boolean,
    latest_comment text,
    latest_reviewer_email text,
    latest_review_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id uuid;
BEGIN
    SELECT target_id INTO v_transaction_id FROM public.approval_requests WHERE id = p_approval_request_id;

    RETURN QUERY
    SELECT 
        tl.id as line_id,
        tl.line_no,
        a.code as account_code,
        a.name as account_name,
        tl.debit_amount,
        tl.credit_amount,
        COUNT(tr.id) as review_count,
        BOOL_OR(tr.review_type = 'request_change') as has_change_requests,
        (SELECT comment FROM public.transaction_line_reviews tr2 WHERE tr2.line_id = tl.id ORDER BY tr2.created_at DESC LIMIT 1) as latest_comment,
        (SELECT u.email FROM public.transaction_line_reviews tr2 JOIN auth.users u ON u.id = tr2.reviewer_user_id WHERE tr2.line_id = tl.id ORDER BY tr2.created_at DESC LIMIT 1) as latest_reviewer_email,
        (SELECT created_at FROM public.transaction_line_reviews tr2 WHERE tr2.line_id = tl.id ORDER BY tr2.created_at DESC LIMIT 1) as latest_review_at
    FROM public.transaction_lines tl
    LEFT JOIN public.transaction_line_reviews tr ON tr.line_id = tl.id
    LEFT JOIN public.accounts a ON a.id = tl.account_id
    WHERE tl.transaction_id = v_transaction_id
    GROUP BY tl.id, tl.line_no, a.code, a.name, tl.debit_amount, tl.credit_amount
    ORDER BY tl.line_no;
END;
$$;

-- 5. RPC: check_lines_review_status
CREATE OR REPLACE FUNCTION public.check_lines_review_status(
    p_transaction_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_lines int;
    v_reviewed_lines int;
    v_lines_with_comments int;
    v_lines_with_change_requests int;
BEGIN
    SELECT COUNT(*) INTO v_total_lines FROM public.transaction_lines WHERE transaction_id = p_transaction_id;
    
    SELECT COUNT(DISTINCT line_id) INTO v_reviewed_lines 
    FROM public.transaction_line_reviews 
    WHERE transaction_id = p_transaction_id AND review_type IN ('approve', 'reject');

    SELECT COUNT(DISTINCT line_id) INTO v_lines_with_comments 
    FROM public.transaction_line_reviews 
    WHERE transaction_id = p_transaction_id AND review_type = 'comment';

    SELECT COUNT(DISTINCT line_id) INTO v_lines_with_change_requests 
    FROM public.transaction_line_reviews 
    WHERE transaction_id = p_transaction_id AND review_type = 'request_change';

    RETURN jsonb_build_object(
        'all_lines_reviewed', v_total_lines > 0 AND v_total_lines = v_reviewed_lines,
        'total_lines', v_total_lines,
        'lines_needing_review', v_total_lines - v_reviewed_lines,
        'lines_with_comments', v_lines_with_comments,
        'lines_with_change_requests', v_lines_with_change_requests
    );
END;
$$;

-- 6. RPC: submit_transaction_for_line_approval
DROP FUNCTION IF EXISTS public.submit_transaction_for_line_approval(uuid, uuid);
CREATE OR REPLACE FUNCTION public.submit_transaction_for_line_approval(
    p_transaction_id uuid,
    p_submitted_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count int;
BEGIN
    UPDATE public.transaction_lines
    SET line_status = 'pending'
    WHERE transaction_id = p_transaction_id AND line_status = 'draft';
    
    GET DIAGNOSTICS v_count = ROW_COUNT;

    UPDATE public.transactions
    SET approval_status = 'submitted',
        submitted_at = now(),
        submitted_by = p_submitted_by
    WHERE id = p_transaction_id;

    RETURN jsonb_build_object('success', true, 'lines_submitted', v_count, 'message', 'Transaction submitted for line approval');
END;
$$;

-- 7. RPC: approve_line (wrapper for add_line_review_comment but simpler)
DROP FUNCTION IF EXISTS public.approve_line(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.approve_line(
    p_line_id uuid,
    p_approved_by uuid,
    p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id uuid;
    v_request_id uuid;
BEGIN
    SELECT transaction_id INTO v_transaction_id FROM public.transaction_lines WHERE id = p_line_id;
    
    -- Find active approval request
    SELECT id INTO v_request_id FROM public.approval_requests 
    WHERE target_id = v_transaction_id AND status = 'pending' LIMIT 1;

    -- Update line
    UPDATE public.transaction_lines
    SET line_status = 'approved',
        approved_by = p_approved_by,
        approved_at = now()
    WHERE id = p_line_id;

    -- Add review record
    INSERT INTO public.transaction_line_reviews (
        transaction_id,
        line_id,
        reviewer_user_id,
        review_type,
        comment,
        approval_request_id
    ) VALUES (
        v_transaction_id,
        p_line_id,
        p_approved_by,
        'approve',
        p_notes,
        v_request_id
    );

    RETURN jsonb_build_object('success', true, 'transaction_approved', false, 'message', 'Line approved');
END;
$$;

-- 8. RPC: reject_line
DROP FUNCTION IF EXISTS public.reject_line(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.reject_line(
    p_line_id uuid,
    p_rejected_by uuid,
    p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id uuid;
    v_request_id uuid;
BEGIN
    SELECT transaction_id INTO v_transaction_id FROM public.transaction_lines WHERE id = p_line_id;
    
    -- Find active approval request
    SELECT id INTO v_request_id FROM public.approval_requests 
    WHERE target_id = v_transaction_id AND status = 'pending' LIMIT 1;

    -- Update line
    UPDATE public.transaction_lines
    SET line_status = 'rejected',
        rejected_by = p_rejected_by,
        rejected_at = now()
    WHERE id = p_line_id;

    -- Add review record
    INSERT INTO public.transaction_line_reviews (
        transaction_id,
        line_id,
        reviewer_user_id,
        review_type,
        comment,
        approval_request_id
    ) VALUES (
        v_transaction_id,
        p_line_id,
        p_rejected_by,
        'reject',
        p_reason,
        v_request_id
    );

    RETURN jsonb_build_object('success', true, 'message', 'Line rejected');
END;
$$;

-- 9. RPC: get_my_line_approvals (placeholder logic)
DROP FUNCTION IF EXISTS public.get_my_line_approvals(uuid);
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
        t.entry_number,
        t.entry_date,
        tl.line_no,
        a.code as account_code,
        a.name as account_name,
        tl.debit_amount,
        tl.credit_amount,
        tl.description,
        o.name as org_name,
        p.name as project_name,
        cc.name as cost_center_name,
        u.email as submitted_by_email,
        t.submitted_at,
        'Normal' as priority,
        EXTRACT(EPOCH FROM (now() - t.submitted_at))/3600 as hours_pending
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

COMMIT;
