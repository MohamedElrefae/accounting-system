-- ============================================================================
-- PHASE 0, TASK 0.2 - FIX VERIFICATION ISSUES (FINAL - NO ROLE COLUMN)
-- ============================================================================

-- ISSUE 1: Orphaned User - anagmdgdn@gmail.com
-- This user has 0 organization assignments
-- Solution: Assign to "مؤسسة الاختبار" (has 5 members)
-- NOTE: org_memberships table does NOT have a "role" column

INSERT INTO org_memberships (user_id, org_id, created_at, updated_at)
VALUES (
  '5eeb26da-0c45-432c-a009-0977c76bfc47',
  'cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- ============================================================================
-- ISSUE 2: Empty Organizations with Foreign Key Constraints
-- Three organizations have no members BUT have accounts referencing them
-- Solution: Delete accounts first, then delete organizations
-- ============================================================================

-- Step 1: Delete accounts that reference empty organizations
DELETE FROM accounts
WHERE org_id IN (
  '0fbe51e8-71ae-48ba-a70c-139045a20843', -- البركة
  '6ec6a563-7ac2-4b76-ac27-41c9d54b4921', -- مروان السعيد
  '61897e4b-a9d1-4efb-ab8f-9bedb457ef34'  -- علي محمد
);

-- Step 2: Delete the empty organizations
DELETE FROM organizations
WHERE id IN (
  '0fbe51e8-71ae-48ba-a70c-139045a20843',
  '6ec6a563-7ac2-4b76-ac27-41c9d54b4921',
  '61897e4b-a9d1-4efb-ab8f-9bedb457ef34'
);

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

