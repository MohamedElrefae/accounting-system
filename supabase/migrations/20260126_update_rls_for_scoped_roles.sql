-- =====================================================
-- SCOPED ROLES MIGRATION - PHASE 3: UPDATE RLS POLICIES
-- =====================================================
-- Date: January 26, 2026
-- Purpose: Update RLS policies to use scoped roles
-- Changes: All table policies to check org_roles/project_roles
-- =====================================================

-- =====================================================
-- 1. ORGANIZATIONS TABLE - RLS POLICIES
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can only see their orgs" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Org admins can manage their organization" ON organizations;

-- New policies using scoped roles
CREATE POLICY "Users can view orgs they belong to"
  ON organizations FOR SELECT
  USING (
    -- Super admins can see all
    is_super_admin(auth.uid())
    OR
    -- Users with any org role can see their org
    EXISTS (
      SELECT 1 FROM org_roles
      WHERE org_id = organizations.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can update their organization"
  ON organizations FOR UPDATE
  USING (
    is_super_admin(auth.uid())
    OR
    has_org_role(auth.uid(), organizations.id, 'org_admin')
  );

CREATE POLICY "Org admins can delete their organization"
  ON organizations FOR DELETE
  USING (
    is_super_admin(auth.uid())
    OR
    has_org_role(auth.uid(), organizations.id, 'org_admin')
  );

CREATE POLICY "Super admins can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid())
  );

-- =====================================================
-- 2. PROJECTS TABLE - RLS POLICIES
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view projects they have access to" ON projects;
DROP POLICY IF EXISTS "Project managers can manage projects" ON projects;
DROP POLICY IF EXISTS "Org admins can manage projects in their org" ON projects;

-- New policies using scoped roles
CREATE POLICY "Users can view projects they have access to"
  ON projects FOR SELECT
  USING (
    -- Super admins can see all
    is_super_admin(auth.uid())
    OR
    -- Users with org role and can_access_all_projects
    EXISTS (
      SELECT 1 FROM org_roles
      WHERE org_id = projects.org_id
      AND user_id = auth.uid()
      AND can_access_all_projects = true
    )
    OR
    -- Users with specific project role
    EXISTS (
      SELECT 1 FROM project_roles
      WHERE project_id = projects.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can create projects in their org"
  ON projects FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid())
    OR
    has_org_role(auth.uid(), projects.org_id, 'org_admin')
    OR
    has_org_role(auth.uid(), projects.org_id, 'org_manager')
  );

CREATE POLICY "Org admins and project managers can update projects"
  ON projects FOR UPDATE
  USING (
    is_super_admin(auth.uid())
    OR
    has_org_role(auth.uid(), projects.org_id, 'org_admin')
    OR
    has_org_role(auth.uid(), projects.org_id, 'org_manager')
    OR
    has_project_role(auth.uid(), projects.id, 'project_manager')
  );

CREATE POLICY "Org admins can delete projects"
  ON projects FOR DELETE
  USING (
    is_super_admin(auth.uid())
    OR
    has_org_role(auth.uid(), projects.org_id, 'org_admin')
  );

-- =====================================================
-- 3. TRANSACTIONS TABLE - RLS POLICIES
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view transactions in their scope" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions in their scope" ON transactions;
DROP POLICY IF EXISTS "Users can update transactions in their scope" ON transactions;
DROP POLICY IF EXISTS "Users can delete transactions in their scope" ON transactions;

-- New policies using scoped roles
CREATE POLICY "Users can view transactions in their scope"
  ON transactions FOR SELECT
  USING (
    -- Super admins can see all
    is_super_admin(auth.uid())
    OR
    -- Users with org role
    EXISTS (
      SELECT 1 FROM org_roles
      WHERE org_id = transactions.org_id
      AND user_id = auth.uid()
      AND role IN ('org_admin', 'org_manager', 'org_accountant', 'org_auditor', 'org_viewer')
    )
    OR
    -- Users with project role (if transaction has project)
    (
      transactions.project_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM project_roles
        WHERE project_id = transactions.project_id
        AND user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Accountants can create transactions"
  ON transactions FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid())
    OR
    -- Org accountants can create
    EXISTS (
      SELECT 1 FROM org_roles
      WHERE org_id = transactions.org_id
      AND user_id = auth.uid()
      AND role IN ('org_admin', 'org_manager', 'org_accountant')
    )
    OR
    -- Project contributors can create (if transaction has project)
    (
      transactions.project_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM project_roles
        WHERE project_id = transactions.project_id
        AND user_id = auth.uid()
        AND role IN ('project_manager', 'project_contributor')
      )
    )
  );

CREATE POLICY "Accountants can update transactions"
  ON transactions FOR UPDATE
  USING (
    is_super_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM org_roles
      WHERE org_id = transactions.org_id
      AND user_id = auth.uid()
      AND role IN ('org_admin', 'org_manager', 'org_accountant')
    )
    OR
    (
      transactions.project_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM project_roles
        WHERE project_id = transactions.project_id
        AND user_id = auth.uid()
        AND role IN ('project_manager', 'project_contributor')
      )
    )
  );

CREATE POLICY "Admins can delete transactions"
  ON transactions FOR DELETE
  USING (
    is_super_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM org_roles
      WHERE org_id = transactions.org_id
      AND user_id = auth.uid()
      AND role IN ('org_admin', 'org_manager')
    )
  );

-- =====================================================
-- 4. TRANSACTION_LINE_ITEMS TABLE - RLS POLICIES
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view line items for accessible transactions" ON transaction_line_items;
DROP POLICY IF EXISTS "Users can create line items for accessible transactions" ON transaction_line_items;
DROP POLICY IF EXISTS "Users can update line items for accessible transactions" ON transaction_line_items;
DROP POLICY IF EXISTS "Users can delete line items for accessible transactions" ON transaction_line_items;

-- New policies using scoped roles (inherit from transaction)
CREATE POLICY "Users can view line items in their scope"
  ON transaction_line_items FOR SELECT
  USING (
    is_super_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM transactions t
      JOIN org_roles or1 ON or1.org_id = t.org_id
      WHERE t.id = transaction_line_items.transaction_id
      AND or1.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM transactions t
      JOIN project_roles pr ON pr.project_id = t.project_id
      WHERE t.id = transaction_line_items.transaction_id
      AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Accountants can create line items"
  ON transaction_line_items FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM transactions t
      JOIN org_roles or1 ON or1.org_id = t.org_id
      WHERE t.id = transaction_line_items.transaction_id
      AND or1.user_id = auth.uid()
      AND or1.role IN ('org_admin', 'org_manager', 'org_accountant')
    )
    OR
    EXISTS (
      SELECT 1 FROM transactions t
      JOIN project_roles pr ON pr.project_id = t.project_id
      WHERE t.id = transaction_line_items.transaction_id
      AND pr.user_id = auth.uid()
      AND pr.role IN ('project_manager', 'project_contributor')
    )
  );

CREATE POLICY "Accountants can update line items"
  ON transaction_line_items FOR UPDATE
  USING (
    is_super_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM transactions t
      JOIN org_roles or1 ON or1.org_id = t.org_id
      WHERE t.id = transaction_line_items.transaction_id
      AND or1.user_id = auth.uid()
      AND or1.role IN ('org_admin', 'org_manager', 'org_accountant')
    )
    OR
    EXISTS (
      SELECT 1 FROM transactions t
      JOIN project_roles pr ON pr.project_id = t.project_id
      WHERE t.id = transaction_line_items.transaction_id
      AND pr.user_id = auth.uid()
      AND pr.role IN ('project_manager', 'project_contributor')
    )
  );

CREATE POLICY "Admins can delete line items"
  ON transaction_line_items FOR DELETE
  USING (
    is_super_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM transactions t
      JOIN org_roles or1 ON or1.org_id = t.org_id
      WHERE t.id = transaction_line_items.transaction_id
      AND or1.user_id = auth.uid()
      AND or1.role IN ('org_admin', 'org_manager')
    )
  );

-- =====================================================
-- 5. ACCOUNTS TABLE - RLS POLICIES
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view accounts in their org" ON accounts;
DROP POLICY IF EXISTS "Accountants can manage accounts" ON accounts;

-- New policies using scoped roles
CREATE POLICY "Users can view accounts in their org"
  ON accounts FOR SELECT
  USING (
    is_super_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM org_roles
      WHERE org_id = accounts.org_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Accountants can create accounts"
  ON accounts FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM org_roles
      WHERE org_id = accounts.org_id
      AND user_id = auth.uid()
      AND role IN ('org_admin', 'org_manager', 'org_accountant')
    )
  );

CREATE POLICY "Accountants can update accounts"
  ON accounts FOR UPDATE
  USING (
    is_super_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM org_roles
      WHERE org_id = accounts.org_id
      AND user_id = auth.uid()
      AND role IN ('org_admin', 'org_manager', 'org_accountant')
    )
  );

CREATE POLICY "Admins can delete accounts"
  ON accounts FOR DELETE
  USING (
    is_super_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM org_roles
      WHERE org_id = accounts.org_id
      AND user_id = auth.uid()
      AND role = 'org_admin'
    )
  );

-- =====================================================
-- 6. USER_PROFILES TABLE - RLS POLICIES
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- New policies using scoped roles
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Super admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Org admins can view profiles in their org"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_roles or1
      JOIN org_roles or2 ON or2.org_id = or1.org_id
      WHERE or1.user_id = auth.uid()
      AND or1.role = 'org_admin'
      AND or2.user_id = user_profiles.id
    )
  );

CREATE POLICY "Super admins can manage profiles"
  ON user_profiles FOR ALL
  USING (is_super_admin(auth.uid()));

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- All RLS policies now use scoped roles
-- Next steps:
-- 1. Test policies with different user roles
-- 2. Update useOptimizedAuth hook (Phase 4)
-- 3. Verify access control works correctly
-- =====================================================

-- Verification query:
-- Test as different users to ensure policies work:
-- SET LOCAL role TO authenticated;
-- SET LOCAL request.jwt.claim.sub TO 'user-id-here';
-- SELECT * FROM organizations;
-- SELECT * FROM projects;
-- SELECT * FROM transactions LIMIT 10;
