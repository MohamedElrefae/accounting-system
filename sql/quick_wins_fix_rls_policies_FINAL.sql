-- ============================================================================
-- QUICK WINS: Fix RLS Policies (FINAL CORRECTED VERSION)
-- ============================================================================
-- This script fixes the most critical security issues:
-- 1. Removes debug RLS policies that allow everything
-- 2. Creates proper org-scoped RLS policies
-- 3. Ensures users can only see data from their organizations
--
-- IMPACT: Immediate improvement in data isolation
-- TIME: 10 minutes to deploy and test
-- RISK: Low (only makes policies more restrictive)
-- ============================================================================

-- ============================================================================
-- FIX 1: Organizations Table RLS
-- ============================================================================

DROP POLICY IF EXISTS "allow_read_organizations" ON organizations;

CREATE POLICY "users_see_their_orgs" ON organizations FOR SELECT
USING (
  id IN (
    SELECT org_id 
    FROM org_memberships 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "super_admins_see_all_orgs" ON organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.is_super_admin = true
  )
);

-- ============================================================================
-- FIX 2: Projects Table RLS
-- ============================================================================

DROP POLICY IF EXISTS "debug_projects_policy" ON projects;

CREATE POLICY "users_see_org_projects" ON projects FOR SELECT
USING (
  org_id IN (
    SELECT org_id 
    FROM org_memberships 
    WHERE user_id = auth.uid()
  )
  OR
  id IN (
    SELECT project_id
    FROM project_memberships
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "super_admins_see_all_projects" ON projects FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.is_super_admin = true
  )
);

-- ============================================================================
-- FIX 3: Transactions Table RLS
-- ============================================================================

DROP POLICY IF EXISTS "tx_select" ON transactions;

CREATE POLICY "users_see_org_transactions" ON transactions FOR SELECT
USING (
  org_id IN (
    SELECT org_id 
    FROM org_memberships 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "super_admins_see_all_transactions" ON transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.is_super_admin = true
  )
);

-- ============================================================================
-- FIX 4: Transaction Line Items RLS
-- ============================================================================

DROP POLICY IF EXISTS "tli_select" ON transaction_line_items;

CREATE POLICY "users_see_org_transaction_line_items" ON transaction_line_items FOR SELECT
USING (
  org_id IN (
    SELECT org_id 
    FROM org_memberships 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "super_a
  )
);

CREATE POLICY "super_admins_see_all_line_items" ON transaction_line_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.is_super_admin = true
  )
);

-- ============================================================================
-- FIX 5: Accounts Table RLS
-- ============================================================================

DROP POLICY IF EXISTS "accounts_select" ON accounts;
DROP POLICY IF EXISTS "users_see_org_accounts" ON accounts;
DROP POLICY IF EXISTS "super_admins_see_all_accounts" ON accounts;

CREATE POLICY "users_see_org_accounts" ON accounts FOR SELECT
USING (
  organization_id IN (
    SELECT org_id 
    FROM org_memberships 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "super_admins_see_all_accounts" ON accounts FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.is_super_admin = true
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify new policies are in place
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('organizations', 'projects', 'transactions', 'transaction_line_items', 'accounts')
ORDER BY tablename, policyname;

-- ============================================================================
-- TEST QUERIES (Run as different users)
-- ============================================================================

-- Test 1: Check what orgs current user can see
SELECT 
  'Organizations I can see:' as test,
  COUNT(*) as count
FROM organizations;

-- Test 2: Check what projects current user can see
SELECT 
  'Projects I can see:' as test,
  COUNT(*) as count
FROM projects;

-- Test 3: Check what transactions current user can see
SELECT 
  'Transactions I can see:' as test,
  COUNT(*) as count
FROM transactions;

-- Test 4: Verify org membership
SELECT 
  'My org memberships:' as test,
  om.org_id,
  o.name as org_name
FROM org_memberships om
JOIN organizations o ON o.id = om.org_id
WHERE om.user_id = auth.uid();
