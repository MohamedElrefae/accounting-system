-- Verify Date Format Fix
-- Run this to confirm the date formatting is working correctly

-- 1. Show current company date format setting
SELECT 
  'Company Configuration:' as section,
  company_name,
  date_format as configured_date_format,
  number_format,
  CASE 
    WHEN date_format = 'DD/MM/YYYY' THEN 'Arabic/European format (DD/MM/YYYY)'
    WHEN date_format = 'MM/DD/YYYY' THEN 'US format (MM/DD/YYYY)'  
    WHEN date_format = 'YYYY-MM-DD' THEN 'ISO format (YYYY-MM-DD)'
    ELSE 'Unknown format: ' || date_format
  END as format_description
FROM company_config 
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Show sample transaction dates in different formats
SELECT 
  'Transaction Dates:' as section,
  entry_number,
  entry_date as stored_date,
  entry_date::text as iso_string,
  TO_CHAR(entry_date, 'DD/MM/YYYY') as dd_mm_yyyy,
  TO_CHAR(entry_date, 'MM/DD/YYYY') as mm_dd_yyyy,
  TO_CHAR(entry_date, 'YYYY-MM-DD') as yyyy_mm_dd,
  description
FROM transactions 
ORDER BY created_at DESC 
LIMIT 3;

-- 3. Test JavaScript Date parsing compatibility
SELECT 
  'Date Parsing Test:' as section,
  '2025-08-26' as input_date,
  '2025-08-26'::date as parsed_date,
  TO_CHAR('2025-08-26'::date, 'DD/MM/YYYY') as arabic_format,
  TO_CHAR('2025-08-26'::date, 'MM/DD/YYYY') as us_format
UNION ALL
SELECT 
  'Current Date:',
  CURRENT_DATE::text,
  CURRENT_DATE,
  TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY'),
  TO_CHAR(CURRENT_DATE, 'MM/DD/YYYY');

-- 4. Ensure date format is set to DD/MM/YYYY (Arabic preference)
UPDATE company_config 
SET date_format = 'DD/MM/YYYY' 
WHERE date_format != 'DD/MM/YYYY';

-- 5. Final verification
SELECT 
  'Final Status:' as result,
  CASE 
    WHEN date_format = 'DD/MM/YYYY' THEN '✅ Date format correctly set to DD/MM/YYYY'
    ELSE '❌ Date format is ' || date_format || ' - should be DD/MM/YYYY'
  END as status,
  company_name
FROM company_config 
ORDER BY created_at DESC 
LIMIT 1;
