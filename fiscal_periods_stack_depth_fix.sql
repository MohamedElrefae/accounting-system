-- ============================================
-- FISCAL PERIODS TABLE - STACK DEPTH FIX
-- NUCLEAR OPTION: Disable RLS and handle auth in app
-- ============================================

-- Step 1: Drop ALL existing RLS policies on fiscal_periods
DROP POLICY IF EXISTS fiscal_periods_delete ON fiscal_periods;
DROP POLICY IF EXISTS fiscal_periods_insert ON fiscal_periods;
DROP POLICY IF EXISTS fiscal_periods_org_access ON fiscal_periods;
DROP POLICY IF EXISTS fiscal_periods_select ON fiscal_periods;
DROP POLICY IF EXISTS fiscal_periods_update ON fiscal_periods;
DROP POLICY IF EXISTS fiscal_periods_supabase_auth ON fiscal_periods;
DROP POLICY IF EXISTS fiscal_periods_supabase_auth_v2 ON fiscal_periods;
DROP POLICY IF EXISTS fiscal_periods_unified_access ON fiscal_periods;

-- Step 2: DISABLE RLS on fiscal_periods table entirely
ALTER TABLE fiscal_periods DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify RLS is disabled
SELECT 
    n.nspname as schemaname,
    c.relname as tablename,
    c.relrowsecurity as rowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'fiscal_periods'
AND n.nspname = 'public';

-- Step 4: Show that no policies exist
SELECT 
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'fiscal_periods'
AND schemaname = 'public';
