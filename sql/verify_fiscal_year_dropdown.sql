-- ============================================
-- VERIFY FISCAL YEAR FOR DROPDOWN
-- Check what should appear in the dropdown
-- ============================================

-- 1. Check fiscal years for the organization
SELECT 
  id,
  org_id,
  year_number,
  name_en,
  name_ar,
  status,
  is_current,
  start_date,
  end_date
FROM fiscal_years
WHERE org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
ORDER BY year_number DESC;

-- 2. Check if RLS is allowing access
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'fiscal_years'
  AND schemaname = 'public';

-- 3. Verify the user can see the data
SELECT 
  fy.id,
  fy.year_number,
  fy.name_en,
  fy.status,
  fy.is_current,
  check_fiscal_org_access(fy.org_id) as has_access
FROM fiscal_years fy
WHERE fy.org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441';
