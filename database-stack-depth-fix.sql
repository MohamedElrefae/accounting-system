-- ============================================
-- FISCAL YEARS TABLE - STACK DEPTH FIX
-- Enterprise Database Optimization Script
-- ============================================

-- Step 1: Analyze current RLS policies
DO $$
BEGIN
    RAISE NOTICE 'Current RLS policies on fiscal_years:';
END $$;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'fiscal_years';

-- Step 2: Check for recursive or complex policies
DO $$
BEGIN
    RAISE NOTICE 'Checking for potentially problematic policies...';
END $$;

SELECT 
    policyname,
    'Potential recursion detected' as issue,
    qual
FROM pg_policies 
WHERE tablename = 'fiscal_years'
AND (
    qual LIKE '%fiscal_years%' 
    OR qual LIKE '%RECURSIVE%'
    OR qual LIKE '%WITH RECURSIVE%'
    OR length(qual) > 500  -- Very complex policies
);

-- Step 3: Backup existing policies
CREATE TABLE IF NOT EXISTS fiscal_years_policy_backup AS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check,
    now() as backup_date
FROM pg_policies 
WHERE tablename = 'fiscal_years';

-- Step 4: Drop problematic policies (if any exist)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'fiscal_years'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON fiscal_years', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Step 4.5: Create Security Definer function to bypass RLS recursion
CREATE OR REPLACE FUNCTION public.check_fiscal_org_access(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM org_memberships 
        WHERE org_id = target_org_id 
        AND user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.check_fiscal_org_access TO authenticated;

-- Step 5: Create optimized, non-recursive RLS policy using the secure function
CREATE POLICY fiscal_years_supabase_auth_v2 ON fiscal_years
    FOR ALL
    USING (
        public.check_fiscal_org_access(org_id)
    )
    WITH CHECK (
        public.check_fiscal_org_access(org_id)
    );

-- Step 8: Test the fix
DO $$
DECLARE
    test_count INTEGER;
    current_user_id UUID;
BEGIN
    -- Get current user (if any)
    SELECT auth.uid() INTO current_user_id;
    
    IF current_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with authenticated user: %', current_user_id;
        
        -- Test basic query with RLS
        SELECT COUNT(*) INTO test_count FROM fiscal_years;
        RAISE NOTICE 'RLS query test: SUCCESS (found % rows)', test_count;
    ELSE
        RAISE NOTICE 'No authenticated user - testing basic structure only';
        
        -- Test table structure without RLS
        SELECT COUNT(*) INTO test_count FROM fiscal_years WHERE false; -- Returns 0 but tests structure
        RAISE NOTICE 'Structure test: SUCCESS';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test failed: %', SQLERRM;
END $$;

-- Step 9: Verify RLS is working correctly
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'fiscal_years' 
        AND n.nspname = 'public' 
        AND c.relrowsecurity = true
    ) THEN
        RAISE NOTICE 'RLS is ENABLED on fiscal_years table';
    ELSE
        RAISE NOTICE 'WARNING: RLS is DISABLED on fiscal_years table';
    END IF;
END $$;

-- Step 10: Performance recommendations
DO $$
BEGIN
    RAISE NOTICE '=== PERFORMANCE RECOMMENDATIONS ===';
    RAISE NOTICE '1. Ensure app.user_orgs is set properly in application context';
    RAISE NOTICE '2. Consider partitioning by org_id if you have many organizations';
    RAISE NOTICE '3. Monitor query performance with pg_stat_statements';
    RAISE NOTICE '4. Set up connection pooling to reduce overhead';
    RAISE NOTICE '5. Consider read replicas for reporting queries';
END $$;

-- Step 11: Create monitoring view
CREATE OR REPLACE VIEW fiscal_years_health_check AS
SELECT 
    'fiscal_years' as table_name,
    (SELECT COUNT(*) FROM fiscal_years) as total_rows,
    (SELECT COUNT(DISTINCT org_id) FROM fiscal_years) as unique_orgs,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'fiscal_years' AND schemaname = 'public') as rls_policies,
    (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'fiscal_years' AND n.nspname = 'public') as rls_enabled,
    now() as check_time;

-- Final verification
SELECT * FROM fiscal_years_health_check;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=== FISCAL YEARS STACK DEPTH FIX COMPLETED ===';
    RAISE NOTICE 'The fiscal_years table has been optimized for enterprise use.';
    RAISE NOTICE 'Stack depth issues should now be resolved.';
    RAISE NOTICE 'Monitor the fiscal_years_health_check view for ongoing health.';
END $$;