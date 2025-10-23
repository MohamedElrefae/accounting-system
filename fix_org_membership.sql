-- Fix Organization Membership Issue
-- Run these queries to add your user to organizations

-- 1. First, let's see what organizations exist
SELECT id, code, name FROM organizations ORDER BY code;

-- 2. Check your current user ID
SELECT auth.uid() as your_user_id;

-- 3. Add yourself to the first organization as a member (roleless)
-- Replace 'YOUR_ORG_ID_HERE' with an actual org ID from step 1
INSERT INTO org_memberships (user_id, org_id)
VALUES (
  auth.uid(), 
  (SELECT id FROM organizations LIMIT 1) -- This takes the first organization
) ON CONFLICT (user_id, org_id) DO NOTHING;

-- 4. Verify the membership was created
SELECT 
  om.user_id,
  om.org_id,
  o.name as org_name,
  o.code as org_code
FROM org_memberships om
JOIN organizations o ON o.id = om.org_id
WHERE om.user_id = auth.uid();
