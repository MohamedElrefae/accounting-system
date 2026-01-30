-- =====================================================
-- SCOPED ROLES MIGRATION - PHASE 1: CREATE TABLES
-- =====================================================
-- Date: January 26, 2026
-- Purpose: Create org-scoped and project-scoped role tables
-- Replaces: Global roles with context-specific roles
-- =====================================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS org_roles CASCADE;
DROP TABLE IF EXISTS project_roles CASCADE;
DROP TABLE IF EXISTS system_roles CASCADE;

-- =====================================================
-- 1. ORGANIZATION-SCOPED ROLES
-- =====================================================
-- Replaces: org_memberships table
-- Purpose: Store user roles within specific organizations
-- =====================================================

CREATE TABLE org_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN (
    'org_admin',      -- Full control in organization
    'org_manager',    -- Manage users and projects
    'org_accountant', -- Manage transactions
    'org_auditor',    -- Read-only audit access
    'org_viewer'      -- Read-only access
  )),
  can_access_all_projects BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure user can only have one role per org
  UNIQUE(user_id, org_id, role)
);

-- Indexes for performance
CREATE INDEX idx_org_roles_user ON org_roles(user_id);
CREATE INDEX idx_org_roles_org ON org_roles(org_id);
CREATE INDEX idx_org_roles_user_org ON org_roles(user_id, org_id);
CREATE INDEX idx_org_roles_role ON org_roles(role);

-- Updated_at trigger
CREATE TRIGGER update_org_roles_updated_at
  BEFORE UPDATE ON org_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE org_roles IS 'Organization-scoped user roles - replaces org_memberships';
COMMENT ON COLUMN org_roles.role IS 'Role within the organization context';
COMMENT ON COLUMN org_roles.can_access_all_projects IS 'If true, user can access all projects in org';

-- =====================================================
-- 2. PROJECT-SCOPED ROLES
-- =====================================================
-- Replaces: project_memberships table
-- Purpose: Store user roles within specific projects
-- =====================================================

CREATE TABLE project_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN (
    'project_manager',   -- Full control in project
    'project_contributor', -- Can create/edit
    'project_viewer'     -- Read-only access
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure user can only have one role per project
  UNIQUE(user_id, project_id, role)
);

-- Indexes for performance
CREATE INDEX idx_project_roles_user ON project_roles(user_id);
CREATE INDEX idx_project_roles_project ON project_roles(project_id);
CREATE INDEX idx_project_roles_user_project ON project_roles(user_id, project_id);
CREATE INDEX idx_project_roles_role ON project_roles(role);

-- Updated_at trigger
CREATE TRIGGER update_project_roles_updated_at
  BEFORE UPDATE ON project_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE project_roles IS 'Project-scoped user roles - replaces project_memberships';
COMMENT ON COLUMN project_roles.role IS 'Role within the project context';

-- =====================================================
-- 3. SYSTEM-LEVEL ROLES (OPTIONAL)
-- =====================================================
-- Purpose: Store system-wide roles (super_admin, etc.)
-- These roles have access across all orgs/projects
-- =====================================================

CREATE TABLE system_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN (
    'super_admin',    -- Full system access
    'system_auditor'  -- Read-only system access
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure user can only have one system role
  UNIQUE(user_id, role)
);

-- Indexes for performance
CREATE INDEX idx_system_roles_user ON system_roles(user_id);
CREATE INDEX idx_system_roles_role ON system_roles(role);

-- Updated_at trigger
CREATE TRIGGER update_system_roles_updated_at
  BEFORE UPDATE ON system_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE system_roles IS 'System-wide roles with access across all organizations';
COMMENT ON COLUMN system_roles.role IS 'System-level role (super_admin, system_auditor)';

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE org_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_roles ENABLE ROW LEVEL SECURITY;

-- Org Roles Policies
CREATE POLICY "Users can view their own org roles"
  ON org_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Org admins can view all org roles"
  ON org_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_roles or2
      WHERE or2.user_id = auth.uid()
      AND or2.org_id = org_roles.org_id
      AND or2.role = 'org_admin'
    )
  );

CREATE POLICY "Super admins can view all org roles"
  ON org_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM system_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Org admins can manage org roles"
  ON org_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_roles or2
      WHERE or2.user_id = auth.uid()
      AND or2.org_id = org_roles.org_id
      AND or2.role = 'org_admin'
    )
  );

CREATE POLICY "Super admins can manage all org roles"
  ON org_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM system_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Project Roles Policies
CREATE POLICY "Users can view their own project roles"
  ON project_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Project managers can view all project roles"
  ON project_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_roles pr2
      WHERE pr2.user_id = auth.uid()
      AND pr2.project_id = project_roles.project_id
      AND pr2.role = 'project_manager'
    )
  );

CREATE POLICY "Org admins can view project roles in their org"
  ON project_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN org_roles or2 ON or2.org_id = p.org_id
      WHERE p.id = project_roles.project_id
      AND or2.user_id = auth.uid()
      AND or2.role = 'org_admin'
    )
  );

CREATE POLICY "Super admins can view all project roles"
  ON project_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM system_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Project managers can manage project roles"
  ON project_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_roles pr2
      WHERE pr2.user_id = auth.uid()
      AND pr2.project_id = project_roles.project_id
      AND pr2.role = 'project_manager'
    )
  );

CREATE POLICY "Org admins can manage project roles in their org"
  ON project_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN org_roles or2 ON or2.org_id = p.org_id
      WHERE p.id = project_roles.project_id
      AND or2.user_id = auth.uid()
      AND or2.role = 'org_admin'
    )
  );

CREATE POLICY "Super admins can manage all project roles"
  ON project_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM system_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- System Roles Policies (only super admins can manage)
CREATE POLICY "Users can view their own system roles"
  ON system_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all system roles"
  ON system_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM system_roles sr2
      WHERE sr2.user_id = auth.uid()
      AND sr2.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage system roles"
  ON system_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM system_roles sr2
      WHERE sr2.user_id = auth.uid()
      AND sr2.role = 'super_admin'
    )
  );

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has role in org
CREATE OR REPLACE FUNCTION has_org_role(
  p_user_id UUID,
  p_org_id UUID,
  p_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM org_roles
    WHERE user_id = p_user_id
    AND org_id = p_org_id
    AND role = p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has role in project
CREATE OR REPLACE FUNCTION has_project_role(
  p_user_id UUID,
  p_project_id UUID,
  p_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_roles
    WHERE user_id = p_user_id
    AND project_id = p_project_id
    AND role = p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM system_roles
    WHERE user_id = p_user_id
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's roles in org
CREATE OR REPLACE FUNCTION get_user_org_roles(
  p_user_id UUID,
  p_org_id UUID
) RETURNS TABLE(role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT or1.role
  FROM org_roles or1
  WHERE or1.user_id = p_user_id
  AND or1.org_id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's roles in project
CREATE OR REPLACE FUNCTION get_user_project_roles(
  p_user_id UUID,
  p_project_id UUID
) RETURNS TABLE(role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT pr.role
  FROM project_roles pr
  WHERE pr.user_id = p_user_id
  AND pr.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run Phase 2 migration to copy data from old tables
-- 2. Update RLS policies to use new tables
-- 3. Update useOptimizedAuth hook
-- 4. Test thoroughly
-- 5. Deprecate old tables (optional)
-- =====================================================
