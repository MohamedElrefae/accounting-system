-- ============================================
-- DIAGNOSE FISCAL YEARS SYNC ISSUE
-- Check why dashboard shows only 2025 but opening balance shows 2023, 2024
-- ============================================

-- 1. Check all fiscal years in the database
SELECT 
  id,
  org_id,
  year_number,
  name_en,
  name_ar,
  start_date,
  end_date,
  status,
  is_current,
  created_at,
  updated_at
FROM fiscal_years
ORDER BY year_number DESC;

-- 2. Check RLS policies on fiscal_years table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'fiscal_years';

-- 3. Test the query that the dashboard uses (replace with your org_id)
-- This simulates what FiscalYearService.getAll() does
SELECT 
  id,
  org_id,
  year_number,
  name_en,
  name_ar,
  description_en,
  description_ar,
  start_date,
  end_date,
  status,
  is_current,
  closed_at,
  closed_by,
  created_by,
  updated_by,
  created_at,
  updated_at
FROM fiscal_years
WHERE org_id = 'YOUR_ORG_ID_HERE'  -- Replace with actual org_id
ORDER BY year_number DESC
LIMIT 100;

-- 4. Check if there are any filters or conditions that might hide years
-- Check for any triggers or functions that might affect the query
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'fiscal_years';

-- 5. Check user permissions
-- Run this to see what the current user can see
SELECT 
  year_number,
  name_en,
  status,
  is_current,
  COUNT(*) as count
FROM fiscal_years
GROUP BY year_number, name_en, status, is_current
ORDER BY year_number DESC;

-- 6. Check if there's a view or materialized view being used
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE viewname LIKE '%fiscal%';

-- 7. Verify the data exists for all years
SELECT 
  year_number,
  COUNT(*) as fiscal_year_count,
  STRING_AGG(DISTINCT status, ', ') as statuses,
  STRING_AGG(DISTINCT CASE WHEN is_current THEN 'CURRENT' ELSE 'NOT_CURRENT' END, ', ') as current_flags
FROM fiscal_years
GROUP BY year_number
ORDER BY year_number DESC;

-- 8. Check opening_balance_imports to see which years have data
SELECT 
  fy.year_number,
  fy.name_en,
  COUNT(DISTINCT obi.id) as import_count,
  MAX(obi.created_at) as last_import
FROM fiscal_years fy
LEFT JOIN opening_balance_imports obi ON obi.fiscal_year_id = fy.id
GROUP BY fy.year_number, fy.name_en
ORDER BY fy.year_number DESC;

-- 9. Check if there's a filter in the application layer
-- This query shows what the FiscalYearSelector component should see
SELECT 
  id,
  year_number,
  name_en,
  name_ar,
  start_date,
  end_date,
  status,
  is_current,
  CASE 
    WHEN is_current THEN 1
    WHEN status = 'active' THEN 2
    WHEN status = 'draft' THEN 3
    ELSE 4
  END as sort_priority
FROM fiscal_years
WHERE org_id = 'YOUR_ORG_ID_HERE'  -- Replace with actual org_id
ORDER BY sort_priority, year_number DESC;

-- 10. Final diagnostic: Check if the issue is with the mapping in the frontend
-- This shows exactly what the service should return
SELECT 
  json_build_object(
    'id', id,
    'orgId', org_id,
    'yearNumber', year_number,
    'nameEn', name_en,
    'nameAr', name_ar,
    'descriptionEn', description_en,
    'descriptionAr', description_ar,
    'startDate', start_date,
    'endDate', end_date,
    'status', status,
    'isCurrent', is_current,
    'closedAt', closed_at,
    'closedBy', closed_by,
    'createdBy', created_by,
    'updatedBy', updated_by,
    'createdAt', created_at,
    'updatedAt', updated_at
  ) as fiscal_year_json
FROM fiscal_years
WHERE org_id = 'YOUR_ORG_ID_HERE'  -- Replace with actual org_id
ORDER BY year_number DESC;
