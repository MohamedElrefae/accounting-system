-- ============================================
-- FIX OPENING BALANCE IMPORTS DELETION
-- Allows deleting a fiscal year by cascading delete to its opening balance imports
-- ============================================

-- 1. Drop the existing restrictive foreign key
ALTER TABLE public.opening_balance_imports
DROP CONSTRAINT IF EXISTS opening_balance_imports_fiscal_year_id_fkey;

-- 2. Re-create the foreign key with ON DELETE CASCADE
ALTER TABLE public.opening_balance_imports
ADD CONSTRAINT opening_balance_imports_fiscal_year_id_fkey
FOREIGN KEY (fiscal_year_id)
REFERENCES public.fiscal_years(id)
ON DELETE CASCADE;

-- 3. Verify the constraint
SELECT conname, confdeltype 
FROM pg_constraint 
WHERE conname = 'opening_balance_imports_fiscal_year_id_fkey';
-- Expected confdeltype: 'c' (cascade)

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Opening Balance Imports constraint updated to ON DELETE CASCADE.';
END $$;
