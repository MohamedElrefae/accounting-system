-- 070_fix_get_my_line_approvals_types_verify.sql
-- Verifies that get_my_line_approvals returns the correct types

BEGIN;

DO $$
DECLARE
    v_result record;
BEGIN
    -- Call the function with a dummy UUID (or a real one if known, but dummy is safer for structure check)
    -- We just want to ensure it doesn't throw a type error during execution
    -- We can't easily check the return types in PL/PGSQL without inspecting catalog, 
    -- but running it will fail if there's a runtime type mismatch with the declared table structure.
    
    -- We use a random UUID that likely has no data, but the query execution itself checks types.
    PERFORM * FROM public.get_my_line_approvals('00000000-0000-0000-0000-000000000000'::uuid);
    
    RAISE NOTICE 'get_my_line_approvals executed successfully';

    -- Verify list_approval_inbox_v2
    PERFORM * FROM public.list_approval_inbox_v2('00000000-0000-0000-0000-000000000000'::uuid);

    RAISE NOTICE 'list_approval_inbox_v2 executed successfully';
END;
$$;

ROLLBACK; -- Rollback to avoid side effects, though this is just a read
