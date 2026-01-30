-- ============================================================================
-- Migration: Add organization_id to user_roles table
-- ============================================================================
-- This migration adds organization scoping to role assignments.
-- After this migration, roles can be assigned per-organization instead of globally.
--
-- BEFORE: User has "accountant" role globally (all orgs)
-- AFTER:  User has "accountant" role in org-1, "admin" role in org-2
--
-- NULL organization_id = global role (super_admin only)
-- ============================================================================

-- Step 1: Add organization_id column
-- ============================================================================
ALTER TABLE user_roles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add comment
COMMENT ON COLUMN user_roles.organization_id IS 
  'Organization scope for this role assignment. NULL = global role (super_admin only). Non-NULL = role applies only within this organization.';

-- Step 2: Create indexes for performance
-- ============================================================================

-- Index for common query: get user roles in specific org
CREATE INDEX IF NOT EXISTS idx_user_roles_user_org 
ON user_roles(user_id, organization_id) 
WHERE is_active = true;

-- Index for org-scoped queries
CREATE INDEX IF NOT EXISTS idx_user_roles_org_id 
ON user_roles(organization_id) 
WHERE organization_id IS NOT NULL;

-- Index for finding global roles
CREATE INDEX IF NOT EXISTS idx_user_roles_global 
ON user_roles(user_id) 
WHERE organization_id IS NULL AND is_active = true;

-- Step 3: Migrate existing data
-- ============================================================================

-- For existing non-super-admin roles, assign to user's primary organization
UPDATE user_roles ur
SET organization_id = (
  SELECT om.org_id 
  FROM org_memberships om 
  WHERE om.user_id = ur.user_id 
  AND om.is_default = true
  LIMIT 1
)
WHERE ur.organization_id IS NULL
AND ur.is_active = true
AND EXISTS (
  SELECT 1 FROM roles r 
  WHERE r.id = ur.role_id 
  AND r.name NOT IN ('super_admin', 'Super Admin')
);

-- Super admin roles stay NULL (global scope)
-- No action needed - they already have organization_id = NULL

-- Step 4: Add constraint to ensure super_admin is always global
-- ============================================================================

-- Create function to validate super_admin is global
CREATE OR REPLACE FUNCTION check_super_admin_is_global()
RETURNS TRIGGER AS $
BEGIN
  -- If role is super_admin, organization_id must be NULL
  IF EXISTS (
    SELECT 1 FROM roles r 
    WHERE r.id = NEW.role_id 
    AND r.name IN ('super_admin', 'Super Admin')
  ) THEN
    IF NEW.organization_id IS NOT NULL THEN
      RAISE EXCEPTION 'Super admin role must be global (organization_id must be NULL)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_check_super_admin_is_global ON user_roles;
CREATE TRIGGER trg_check_super_admin_is_global
  BEFORE INSERT OR UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION check_super_admin_is_global();

-- Step 5: Update RLS policies for user_roles table
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

-- Policy 1: Users can view their own roles
CREATE POLICY "users_view_own_roles" ON user_roles FOR SELECT
USING (user_id = auth.uid());

-- Policy 2: Super admins can view all roles
CREATE POLICY "super_admins_view_all_roles" ON user_roles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.is_super_admin = true
  )
);

-- Policy 3: Org admins can view roles in their orgs
CREATE POLICY "org_admins_view_org_roles" ON user_roles FOR SELECT
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('admin', 'Admin')
    AND ur.is_active = true
  )
);

-- Policy 4: Super admins can manage all roles
CREATE POLICY "super_admins_manage_roles" ON user_roles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.is_super_admin = true
  )
);

-- Policy 5: Org admins can manage roles in their orgs
CREATE POLICY "org_admins_manage_org_roles" ON user_roles FOR ALL
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('admin', 'Admin')
    AND ur.is_active = true
  )
)
WITH CHECK (
  organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('admin', 'Admin')
    AND ur.is_active = true
  )
);

-- Step 6: Create helper function to get user roles in org
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_roles_in_org(
  p_user_id UUID,
  p_org_id UUID
)
RETURNS TEXT[] AS $
DECLARE
  v_roles TEXT[];
BEGIN
  -- Get roles for user in specific org
  SELECT array_agg(DISTINCT r.name)
  INTO v_roles
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id
  AND (
    ur.organization_id = p_org_id  -- Org-specific role
    OR ur.organization_id IS NULL  -- Global role (super_admin)
  )
  AND ur.is_active = true;
  
  RETURN COALESCE(v_roles, ARRAY[]::TEXT[]);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_roles_in_org(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION get_user_roles_in_org(UUID, UUID) IS 
  'Get all roles for a user in a specific organization (includes global roles like super_admin)';

-- Step 7: Create helper function to check if user has role in org
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_role_in_org(
  p_user_id UUID,
  p_role_name TEXT,
  p_org_id UUID
)
RETURNS BOOLEAN AS $
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
    AND r.name = p_role_name
    AND (
      ur.organization_id = p_org_id  -- Org-specific role
      OR ur.organization_id IS NULL  -- Global role
    )
    AND ur.is_active = true
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION user_has_role_in_org(UUID, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION user_has_role_in_org(UUID, TEXT, UUID) IS 
  'Check if user has a specific role in an organization';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify migration results
SELECT 
  '=== MIGRATION VERIFICATION ===' as section;

-- Check 1: All non-super-admin roles have organization_id
SELECT 
  'Non-super-admin roles without org_id:' as check,
  COUNT(*) as count
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
WHERE ur.organization_id IS NULL
AND r.name NOT IN ('super_admin', 'Super Admin')
AND ur.is_active = true;
-- Expected: 0

-- Check 2: All super-admin roles have NULL organization_id
SELECT 
  'Super-admin roles with org_id (should be 0):' as check,
  COUNT(*) as count
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
WHERE ur.organization_id IS NOT NULL
AND r.name IN ('super_admin', 'Super Admin')
AND ur.is_active = true;
-- Expected: 0

-- Check 3: View role distribution by org
SELECT 
  'Role distribution by organization:' as section;

SELECT 
  COALESCE(o.name, 'GLOBAL (super_admin)') as organization,
  r.name as role,
  COUNT(*) as user_count,
  array_agg(up.email) as users
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
JOIN user_profiles up ON up.id = ur.user_id
LEFT JOIN organizations o ON o.id = ur.organization_id
WHERE ur.is_active = true
GROUP BY o.name, r.name
ORDER BY o.name, r.name;

-- Check 4: Test helper functions
SELECT 
  'Test helper functions:' as section;

-- Get roles for a user in an org
SELECT 
  up.email,
  o.name as organization,
  get_user_roles_in_org(up.id, o.id) as roles
FROM user_profiles up
CROSS JOIN organizations o
WHERE up.email LIKE '%@%'
LIMIT 5;

-- Check if user has specific role in org
SELECT 
  up.email,
  o.name as organization,
  user_has_role_in_org(up.id, 'accountant', o.id) as is_accountant,
  user_has_role_in_org(up.id, 'admin', o.id) as is_admin
FROM user_profiles up
CROSS JOIN organizations o
WHERE up.email LIKE '%@%'
LIMIT 5;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

/*
-- To rollback this migration:

-- Drop helper functions
DROP FUNCTION IF EXISTS get_user_roles_in_org(UUID, UUID);
DROP FUNCTION IF EXISTS user_has_role_in_org(UUID, TEXT, UUID);

-- Drop trigger and function
DROP TRIGGER IF EXISTS trg_check_super_admin_is_global ON user_roles;
DROP FUNCTION IF EXISTS check_super_admin_is_global();

-- Drop indexes
DROP INDEX IF EXISTS idx_user_roles_user_org;
DROP INDEX IF EXISTS idx_user_roles_org_id;
DROP INDEX IF EXISTS idx_user_roles_global;

-- Remove column
ALTER TABLE user_roles DROP COLUMN IF EXISTS organization_id;

-- Restore old RLS policies (if you have them backed up)
*/

-- ============================================================================
-- NOTES
-- ============================================================================

/*
1. This migration is backward compatible:
   - Existing code that doesn't use organization_id will still work
   - Global roles (super_admin) remain global (organization_id = NULL)
   - Non-super-admin roles are assigned to user's primary organization

2. After this migration, you can:
   - Assign different roles to users in different organizations
   - Query roles per organization
   - Enforce org-scoped permissions

3. Next steps:
   - Update get_user_auth_data_with_scope() RPC to return org_roles
   - Update frontend to use org-scoped role checks
   - Update permission checks to consider organization context

4. Performance:
   - Indexes are created for common query patterns
   - Helper functions use SECURITY DEFINER for consistent access
   - RLS policies ensure data isolation

5. Security:
   - Super admin roles cannot be org-scoped (enforced by trigger)
   - Org admins can only manage roles in their organizations
   - Users can only view their own roles (unless admin)
*/
