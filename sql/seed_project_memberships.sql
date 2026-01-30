-- Seed project memberships for testing
-- This script assigns current users to projects

-- First, get the current user ID (you'll need to run this in Supabase SQL Editor while logged in)
-- The auth.uid() function will return the current user's ID

-- Example: Assign current user to all projects in their organization
INSERT INTO project_memberships (
  project_id,
  user_id,
  org_id,
  role,
  can_create,
  can_edit,
  can_delete,
  can_approve,
  is_default
)
SELECT 
  p.id,
  auth.uid(),
  p.org_id,
  'admin',
  true,
  true,
  true,
  true,
  true
FROM projects p
WHERE p.org_id IN (
  SELECT om.organization_id 
  FROM org_memberships om 
  WHERE om.user_id = auth.uid()
)
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Verify the memberships were created
SELECT 
  pm.id,
  pm.project_id,
  p.code as project_code,
  pm.user_id,
  pm.role,
  pm.created_at
FROM project_memberships pm
JOIN projects p ON pm.project_id = p.id
WHERE pm.user_id = auth.uid()
ORDER BY pm.created_at DESC;
