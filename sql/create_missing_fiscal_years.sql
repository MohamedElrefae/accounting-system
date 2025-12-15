-- ============================================
-- CREATE MISSING FISCAL YEARS (2023, 2024)
-- ============================================

-- IMPORTANT: Replace 'YOUR_ORG_ID_HERE' with your actual organization ID
-- You can find it by running: SELECT id, code, name FROM organizations;

-- Get your org_id first
SELECT id, code, name FROM organizations;

-- Get your user_id
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- ============================================
-- Option 1: Use the RPC function (RECOMMENDED)
-- ============================================

-- Create FY 2023
SELECT create_fiscal_year(
  p_org_id := 'YOUR_ORG_ID_HERE',
  p_year_number := 2023,
  p_start_date := '2023-01-01',
  p_end_date := '2023-12-31',
  p_user_id := 'YOUR_USER_ID_HERE',
  p_create_monthly_periods := true,
  p_name_en := 'FY 2023',
  p_name_ar := 'السنة المالية 2023',
  p_description_en := 'Fiscal Year 2023',
  p_description_ar := null
);

-- Create FY 2024
SELECT create_fiscal_year(
  p_org_id := 'YOUR_ORG_ID_HERE',
  p_year_number := 2024,
  p_start_date := '2024-01-01',
  p_end_date := '2024-12-31',
  p_user_id := 'YOUR_USER_ID_HERE',
  p_create_monthly_periods := true,
  p_name_en := 'FY 2024',
  p_name_ar := 'السنة المالية 2024',
  p_description_en := 'Fiscal Year 2024',
  p_description_ar := null
);

-- ============================================
-- Option 2: Direct INSERT (if RPC doesn't exist)
-- ============================================

-- Insert FY 2023
INSERT INTO fiscal_years (
  org_id,
  year_number,
  name_en,
  name_ar,
  start_date,
  end_date,
  status,
  is_current,
  created_by,
  updated_by
) VALUES (
  'YOUR_ORG_ID_HERE',
  2023,
  'FY 2023',
  'السنة المالية 2023',
  '2023-01-01',
  '2023-12-31',
  'closed',  -- Past year should be closed
  false,
  'YOUR_USER_ID_HERE',
  'YOUR_USER_ID_HERE'
);

-- Insert FY 2024
INSERT INTO fiscal_years (
  org_id,
  year_number,
  name_en,
  name_ar,
  start_date,
  end_date,
  status,
  is_current,
  created_by,
  updated_by
) VALUES (
  'YOUR_ORG_ID_HERE',
  2024,
  'FY 2024',
  'السنة المالية 2024',
  '2024-01-01',
  '2024-12-31',
  'closed',  -- Past year should be closed
  false,
  'YOUR_USER_ID_HERE',
  'YOUR_USER_ID_HERE'
);

-- ============================================
-- Verify the creation
-- ============================================

SELECT 
  year_number,
  name_en,
  start_date,
  end_date,
  status,
  is_current
FROM fiscal_years
WHERE org_id = 'YOUR_ORG_ID_HERE'
ORDER BY year_number DESC;

-- ============================================
-- Set 2025 as current (if needed)
-- ============================================

-- First, unset all current flags
UPDATE fiscal_years 
SET is_current = false 
WHERE org_id = 'YOUR_ORG_ID_HERE';

-- Then set 2025 as current
UPDATE fiscal_years 
SET is_current = true 
WHERE org_id = 'YOUR_ORG_ID_HERE' 
  AND year_number = 2025;

-- Verify
SELECT 
  year_number,
  name_en,
  status,
  is_current
FROM fiscal_years
WHERE org_id = 'YOUR_ORG_ID_HERE'
ORDER BY year_number DESC;
