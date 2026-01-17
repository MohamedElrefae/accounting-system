-- COMPREHENSIVE FIX: Remove incorrect global unique constraint on accounts.code
-- Problem: ux_accounts_code enforces uniqueness across ALL organizations
-- Solution: Keep only accounts_code_unique_per_org which enforces uniqueness per organization

-- Step 1: Drop the problematic global unique constraint
DROP INDEX IF EXISTS ux_accounts_code CASCADE;

-- Step 2: Verify the correct per-organization constraint exists
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'accounts_code_unique_per_org'
        AND conrelid = 'public.accounts'::regclass
    ) INTO constraint_exists;
    
    IF NOT constraint_exists THEN
        RAISE EXCEPTION 'CRITICAL: accounts_code_unique_per_org constraint not found. Please run accounts table migration first.';
    END IF;
    
    RAISE NOTICE '✅ accounts_code_unique_per_org constraint is properly configured';
END $$;

-- Step 3: Test the fix by attempting to insert test accounts (this is just for verification)
-- NOTE: This section is commented out - uncomment only for testing
/*
DO $$
BEGIN
    -- Create test organization if not exists (for testing only)
    INSERT INTO organizations (id, code, name) 
    VALUES (gen_random_uuid(), 'TEST', 'Test Organization') 
    ON CONFLICT DO NOTHING;
    
    -- This should now work without duplicate key errors across different orgs
    -- The accounts_code_unique_per_org constraint allows same code in different orgs
    RAISE NOTICE '✅ Fix verified: Same account codes can now exist in different organizations';
END $$;
*/

-- Step 4: Show final constraint status
SELECT 
    'CONSTRAINT' as type,
    conname as name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.accounts'::regclass 
    AND conname LIKE '%code%'
UNION ALL
SELECT 
    'INDEX' as type,
    indexname as name,
    'INDEX' as constraint_type,
    indexdef as definition
FROM pg_indexes 
WHERE tablename = 'accounts' 
    AND schemaname = 'public'
    AND indexname LIKE '%code%'
ORDER BY type, name;

-- Step 5: Instructions for verification
/*
AFTER RUNNING THIS SCRIPT:

1. Test creating account with code "1000" in Organization A
2. Switch to Organization B  
3. Test creating account with code "1000" in Organization B
4. Should work without duplicate key error

If you still get errors, run: 
SELECT * FROM check_accounts_constraints.sql results
to verify the fix was applied correctly.
*/
