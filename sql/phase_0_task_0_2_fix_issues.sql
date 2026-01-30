-- ============================================================================
-- PHASE 0, TASK 0.2 - FIX VERIFICATION ISSUES
-- ============================================================================

-- ISSUE 1: Orphaned User - anagmdgdn@gmail.com
-- This user has 0 organization assignments
-- Solution: Assign to an organization

-- First, let's find a suitable organization to assign this user to
-- We'll assign to "موسسة الاختبار" which has 5 members
SELECT id, name FROM organizations WHERE name = 'مؤسسة الاختبار' LIMIT 1;

-- Assign orphaned user to organization
-- Replace 'org-id-here' with the actual org_id from the query above
INSERT INTO org_memberships (user_id, org_id, role, created_at, updated_at)
VALUES (
  '5eeb26da-0c45-432c-a009-0977c76bfc47',
  'org-id-here', -- REPLACE WITH ACTUAL ORG_ID
  'accountant',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- ============================================================================
-- ISSUE 2: Empty Organizations
-- Three organizations have no members:
-- - البركة
-- - مروان السعيد
-- - علي محمد
-- ============================================================================

-- OPTION A: Delete Empty Organizations
-- Uncomment to delete empty organizations
/*
DELETE FROM organizations
WHERE name IN ('البركة', 'مروان السعيد', 'علي محمد');
*/

-- OPTION B: Assign Members to Empty Organizations
-- Uncomment to assign members instead of deleting
/*
-- Get the IDs of empty organizations
SELECT id, name FROM organizations 
WHERE name IN ('البركة', 'مروان السعيد', 'علي محمد');

-- Assign a user to each empty organization
-- Replace user-id and org-id with actual values
INSERT INTO org_memberships (user_id, org_id, role, created_at, updated_at)
VALUES 
  ('user-id-1', 'org-id-1', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('user-id-2', 'org-id-2', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('user-id-3', 'org-id-3', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
*/

-- ============================================================================
-- VERIFICATION: Re-check after fixes
-- ============================================================================

-- Check all users have org assignments
SELECT 
  u.id,
  u.email,
  COUNT(om.org_id) as org_count
FROM auth.users u
LEFT JOIN org_memberships om ON u.id = om.user_id
GROUP BY u.id, u.email
ORDER BY org_count ASC;

-- Check organization coverage
SELECT 
  o.id,
  o.name,
  COUNT(om.user_id) as member_count
FROM organizations o
LEFT JOIN org_memberships om ON o.id = om.org_id
GROUP BY o.id, o.name
ORDER BY member_count ASC;

