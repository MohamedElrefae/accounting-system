-- Fix duplicate key constraint error by removing global unique constraint on accounts.code
-- The constraint ux_accounts_code enforces uniqueness across ALL organizations, which is wrong
-- We only need uniqueness per organization, which is already handled by accounts_code_unique_per_org

-- Drop the incorrect global unique constraint
DROP INDEX IF EXISTS ux_accounts_code;

-- Verify the correct per-organization constraint exists
-- This constraint ensures account codes are unique only within each organization
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'accounts_code_unique_per_org'
    ) THEN
        RAISE EXCEPTION 'Expected constraint accounts_code_unique_per_org not found';
    END IF;
END $$;

-- Verify the fix by checking constraints on accounts table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.accounts'::regclass 
    AND conname LIKE '%code%'
ORDER BY conname;
