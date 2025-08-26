-- Test Date Format Issue Fix
-- This SQL will help verify the date format configuration and fix any issues

-- 1. Check current company configuration (date_format and number_format)
SELECT 
  company_name,
  date_format,
  number_format,
  created_at,
  updated_at
FROM company_config 
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Check sample transaction dates (to see current format)
SELECT 
  id,
  entry_number,
  entry_date,
  description,
  amount,
  created_at
FROM transactions 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Update date format if needed (set to DD/MM/YYYY for Arabic preference)
UPDATE company_config 
SET 
  date_format = 'DD/MM/YYYY',
  number_format = 'ar-SA',
  updated_at = NOW()
WHERE id = (
  SELECT id 
  FROM company_config 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- 4. Verify the update
SELECT 
  'After Update:' as status,
  company_name,
  date_format,
  number_format,
  updated_at
FROM company_config 
ORDER BY created_at DESC 
LIMIT 1;

-- 5. Test date parsing with different formats
WITH date_test AS (
  SELECT 
    '2025-08-26'::date as iso_date,
    '26/08/2025' as display_format,
    '08/26/2025' as us_format
)
SELECT 
  iso_date,
  iso_date::text as iso_string,
  TO_CHAR(iso_date, 'DD/MM/YYYY') as dd_mm_yyyy,
  TO_CHAR(iso_date, 'MM/DD/YYYY') as mm_dd_yyyy,
  TO_CHAR(iso_date, 'YYYY-MM-DD') as yyyy_mm_dd
FROM date_test;

-- 6. Insert a test transaction with today's date
INSERT INTO transactions (
  entry_number,
  entry_date,
  description,
  debit_account_id,
  credit_account_id,
  amount,
  notes
) VALUES (
  'TEST-' || TO_CHAR(NOW(), 'YYYYMM') || '-0001',
  CURRENT_DATE,
  'Test transaction for date formatting verification',
  (SELECT id FROM accounts WHERE is_postable = true LIMIT 1),
  (SELECT id FROM accounts WHERE is_postable = true OFFSET 1 LIMIT 1),
  100.00,
  'Created to test date formatting fix'
);

-- 7. Verify the test transaction
SELECT 
  'Test Transaction:' as status,
  entry_number,
  entry_date,
  entry_date::text as date_as_text,
  TO_CHAR(entry_date, 'DD/MM/YYYY') as formatted_dd_mm_yyyy,
  description,
  amount
FROM transactions 
WHERE entry_number LIKE 'TEST-%'
ORDER BY created_at DESC
LIMIT 1;
