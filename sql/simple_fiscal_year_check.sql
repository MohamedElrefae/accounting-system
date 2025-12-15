-- Simple check - just verify fiscal year 2025 exists
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
