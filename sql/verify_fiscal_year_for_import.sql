-- Verify fiscal year 2025 exists and is accessible
-- This is what the opening balance import dropdown should see

-- 1. Check fiscal year exists
SELECT 
  id,
  org_id,
  year_number,
  name_en,
  name_ar,
  start_date,
  end_date,
  status,
  is_current
FROM fiscal_years
WHERE year_number = 2025;

-- 2. Check if you can access it (RLS check)
SELECT 
  id,
  year_number,
  name_en,
  status,
  'You can see this fiscal year ✓' as access_status
FROM fiscal_years
WHERE year_number = 2025;

-- 3. Check your organization ID
SELECT 
  uo.org_id,
  o.code as org_code,
  o.name as org_name,
  uo.role
FROM user_organizations uo
JOIN organizations o ON o.id = uo.org_id
WHERE uo.user_id = auth.uid();

-- 4. Verify fiscal year belongs to your organization
SELECT 
  fy.id,
  fy.year_number,
  fy.org_id,
  o.code as org_code,
  o.name as org_name,
  CASE 
    WHEN uo.org_id IS NOT NULL THEN '✓ You have access to this org'
    ELSE '❌ You do NOT have access to this org'
  END as access_check
FROM fiscal_years fy
JOIN organizations o ON o.id = fy.org_id
LEFT JOIN user_organizations uo ON uo.org_id = fy.org_id AND uo.user_id = auth.uid()
WHERE fy.year_number = 2025;
