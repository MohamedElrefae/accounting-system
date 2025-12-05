-- debug_approvals_data.sql
-- Check why approvals are not showing up

BEGIN;

DO $$
DECLARE
    v_user_id uuid;
    v_count int;
BEGIN
    -- 1. Get the current user ID (simulated or actual if running in context, but here we might need to look it up)
    -- For debugging, let's just list ALL pending items and see if ANY exist.
    
    RAISE NOTICE '--- Checking Transactions ---';
    SELECT COUNT(*) INTO v_count FROM public.transactions;
    RAISE NOTICE 'Total Transactions: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM public.transactions WHERE approval_status = 'submitted';
    RAISE NOTICE 'Submitted Transactions: %', v_count;

    RAISE NOTICE '--- Checking Transaction Lines ---';
    SELECT COUNT(*) INTO v_count FROM public.transaction_lines;
    RAISE NOTICE 'Total Lines: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM public.transaction_lines WHERE line_status = 'pending';
    RAISE NOTICE 'Pending Lines: %', v_count;

    RAISE NOTICE '--- Checking Approval Requests ---';
    SELECT COUNT(*) INTO v_count FROM public.approval_requests;
    RAISE NOTICE 'Total Requests: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM public.approval_requests WHERE status = 'pending';
    RAISE NOTICE 'Pending Requests: %', v_count;

    -- Check if there are any approval steps defined
    RAISE NOTICE '--- Checking Approval Workflows ---';
    SELECT COUNT(*) INTO v_count FROM public.approval_workflows WHERE is_active = true;
    RAISE NOTICE 'Active Workflows: %', v_count;

    -- Check roles for a sample user (if we could pick one, but we can't easily guess the user's ID here without input)
    -- We'll just dump the first 5 pending requests and their requirements
    
    RAISE NOTICE '--- Sample Pending Request Requirements ---';
    FOR v_count IN 0..5 LOOP
        -- This is just a loop to print a few rows if they exist
    END LOOP;
    
END;
$$;

-- Select actual data to view in output
SELECT 'Transactions (All)' as type, id, entry_number, approval_status, is_posted, created_by FROM public.transactions ORDER BY created_at DESC LIMIT 10;
SELECT 'Lines (All)' as type, id, transaction_id, line_status FROM public.transaction_lines ORDER BY created_at DESC LIMIT 10;
SELECT 'Requests (All)' as type, id, target_id, workflow_id, current_step_order, status FROM public.approval_requests ORDER BY created_at DESC LIMIT 10;
SELECT 'Workflows' as type, id, name, is_active FROM public.approval_workflows WHERE is_active = true LIMIT 5;

ROLLBACK;
