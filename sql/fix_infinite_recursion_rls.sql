-- =====================================================
-- EMERGENCY FIX: INFINITE RECURSION IN RLS POLICIES
-- =====================================================
-- Issue: system_roles RLS policies check system_roles itself
-- Solution: Disable RLS on role tables, use SECURITY DEFINER functions
-- =====================================================

-- Step 1: Disable RLS on role tables to break the recursion
ALTER TABLE org_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_roles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all problematic policies
DROP POLICY IF EXISTS "Users can view their own org roles" ON org_roles;
DROP POLICY IF EXISTS "Org admins can view all org roles" ON org_roles;
DROP POLICY IF EXISTS "Super admins can view all org roles" ON org_roles;
DROP POLICY IF EXISTS "Org admins can manage org roles" ON org_roles;
DROP POLICY IF EXISTS "Super admins can manage all org roles" ON org_roles;

DROP POLICY IF EXISTS "Users can view their own project roles" ON project_roles;
DROP POLICY IF EXISTS "Project managers can view all project roles" ON project_roles;
DROP POLICY IF EXISTS "Org admins can view project roles in their org" ON project_roles;
DROP POLICY IF EXISTS "Super admins can view all project roles" ON project_roles;
DROP POLICY IF EXISTS "Project managers can manage project roles" ON project_roles;
DROP POLICY IF EXISTS "Org admins can manage project roles in their org" ON project_roles;
DROP POLICY IF EXISTS "Super admins can manage all project roles" ON project_roles;

DROP POLICY IF EXISTS "Users can view their own system roles" ON system_roles;
DROP POLICY IF EXISTS "Super admins can view all system roles" ON system_roles;
DROP POLICY IF EXISTS "Super admins can manage system roles" ON system_roles;

-- Step 3: Re-enable RLS with safe policies that don't cause recursion
ALTER TABLE org_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create safe policies that use SECURITY DEFINER functions
-- These functions are trusted and won't trigger RLS recursion

-- Org Roles - Simple policies
CREATE POLICY "org_roles_select_own"
  ON org_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "org_roles_select_admin"
  ON org_roles FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "org_roles_all_admin"
  ON org_roles FOR ALL
  USING (is_super_admin(auth.uid()));

-- Project Roles - Simple policies
CREATE POLICY "project_roles_select_own"
  ON project_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "project_roles_select_admin"
  ON project_roles FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "project_roles_all_admin"
  ON project_roles FOR ALL
  USING (is_super_admin(auth.uid()));

-- System Roles - Simple policies (no recursion!)
CREATE POLICY "system_roles_select_own"
  ON system_roles FOR SELECT
  USING (user_id = auth.uid());

-- For system_roles, we need a special approach:
-- Only allow super admins to see/manage, but check via a direct query
-- NOT via a subquery that would cause recursion
CREATE POLICY "system_roles_admin_direct"
  ON system_roles FOR ALL
  USING (
    -- Direct check: is current user a super admin?
    -- This uses the SECURITY DEFINER function which bypasses RLS
    is_super_admin(auth.uid())
  );

-- Step 5: Update organizations RLS to be simpler
DROP POLICY IF EXISTS "Users can view orgs they belong to" ON organizations;
DROP POLICY IF EXISTS "Org admins can update their organization" ON organizations;
DROP POLICY IF EXISTS "Org admins can delete their organization" ON organizations;
DROP POLICY IF EXISTS "Super admins can create organizations" ON organizations;

-- New simpler policies for organizations
CREATE POLICY "orgs_select_all"
  ON organizations FOR SELECT
  USING (
    is_super_admin(auth.uid())
    OR
    -- User has any role in this org
    EXISTS (
      SELECT 1 FROM org_roles
      WHERE org_id = organizations.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "orgs_update_admin"
  ON organizations FOR UPDATE
  USING (
    is_super_admin(auth.uid())
    OR
    has_org_role(auth.uid(), organizations.id, 'org_admin')
  );

CREATE POLICY "orgs_delete_admin"
  ON organizations FOR DELETE
  USING (
    is_super_admin(auth.uid())
    OR
    has_org_role(auth.uid(), organizations.id, 'org_admin')
  );

CREATE POLICY "orgs_insert_admin"
  ON organizations FOR INSERT
  WITH CHECK (is_super_admin(auth.uid()));

-- Step 6: Update projects RLS to be simpler
DROP POLICY IF EXISTS "Users can view projects they have access to" ON projects;
DROP POLICY IF EXISTS "Org admins can create projects in their org" ON projects;
DROP POLICY IF EXISTS "Org admins and project managers can update projects" ON projects;
DROP POLICY IF EXISTS "Org admins can delete projects" ON projects;

-- New simpler policies for projects
CREATE POLICY "projects_select_all"
  ON projects FOR SELECT
  USING (
    is_super_admin(auth.uid())
    OR
    -- User has org role with all-projects access
    EXISTS (
      SELECT 1 FROM org_roles
      WHERE org_id = projects.org_id
      AND user_id = auth.uid()
      AND can_access_all_projects = true
    )
    OR
    -- User has specific project role
    EXISTS (
      SELECT 1 FROM project_roles
      WHERE project_id = projects.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "projects_insert_admin"
  ON projects FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid())
    OR
    has_org_role(auth.uid(), projects.org_id, 'org_admin')
  );

CREATE POLICY "projects_update_admin"
  ON projects FOR UPDATE
  USING (
    is_super_admin(auth.uid())
    OR
    has_org_role(auth.uid(), projects.org_id, 'org_admin')
  );

CREATE POLICY "projects_delete_admin"
  ON projects FOR DELETE
  USING (
    is_super_admin(auth.uid())
    OR
    has_org_role(auth.uid(), projects.org_id, 'org_admin')
  );

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Test that organizations can be loaded without recursion:
-- SELECT * FROM organizations LIMIT 1;
-- SELECT * FROM projects LIMIT 1;
-- =====================================================
