-- ============================================
-- FIX FISCAL PERIODS DELETION
-- Allows deleting a fiscal year by cascading delete to its periods
-- ============================================

-- 1. Drop the existing restrictive foreign key
ALTER TABLE public.fiscal_periods
DROP CONSTRAINT IF EXISTS fiscal_periods_fiscal_year_id_fkey;

-- 2. Re-create the foreign key with ON DELETE CASCADE
ALTER TABLE public.fiscal_periods
ADD CONSTRAINT fiscal_periods_fiscal_year_id_fkey
FOREIGN KEY (fiscal_year_id)
REFERENCES public.fiscal_years(id)
ON DELETE CASCADE;

-- 3. Verify the constraint
SELECT conname, confdeltype 
FROM pg_constraint 
WHERE conname = 'fiscal_periods_fiscal_year_id_fkey';
-- Expected confdeltype: 'c' (cascade)

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Fiscal Periods constraint updated to ON DELETE CASCADE.';
END $$;
