-- Test Currency Symbol 'none' Option
-- This SQL will test the currency symbol configuration including the 'none' option

-- 1. Check current currency settings
SELECT 
  'Current Settings:' as section,
  company_name,
  currency_code,
  currency_symbol,
  date_format,
  number_format
FROM company_config 
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Test setting currency_symbol to 'none'
UPDATE company_config 
SET 
  currency_symbol = 'none',
  updated_at = NOW()
WHERE id = (
  SELECT id 
  FROM company_config 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- 3. Verify the 'none' setting
SELECT 
  'After Setting to None:' as section,
  company_name,
  currency_symbol,
  CASE 
    WHEN currency_symbol = 'none' THEN '✅ Currency symbol set to "none" - numbers only will be displayed'
    ELSE '❌ Currency symbol is: ' || currency_symbol
  END as status
FROM company_config 
ORDER BY created_at DESC 
LIMIT 1;

-- 4. Test various currency_symbol options
-- Test different currency symbols
WITH currency_options AS (
  SELECT 'none' as symbol, 'Numbers only (no symbol)' as description
  UNION ALL SELECT 'ر.س', 'Saudi Riyal'
  UNION ALL SELECT 'د.إ', 'UAE Dirham'  
  UNION ALL SELECT 'ج.م', 'Egyptian Pound'
  UNION ALL SELECT '$', 'US Dollar'
  UNION ALL SELECT '€', 'Euro'
)
SELECT 
  'Available Currency Options:' as section,
  symbol,
  description
FROM currency_options;

-- 5. Simulate different currency symbol displays for amount 1500.75
WITH test_amounts AS (
  SELECT 1500.75 as amount
), currency_tests AS (
  SELECT 
    amount,
    'none' as currency_symbol,
    TO_CHAR(amount, 'FM999,999.00') as formatted_none,
    TO_CHAR(amount, 'FM999,999.00') || ' ر.س' as formatted_with_riyal,
    TO_CHAR(amount, 'FM999,999.00') || ' $' as formatted_with_dollar
  FROM test_amounts
)
SELECT 
  'Format Examples for 1500.75:' as section,
  'none (numbers only): ' || formatted_none as example1,
  'ر.س (Saudi Riyal): ' || formatted_with_riyal as example2,
  '$ (US Dollar): ' || formatted_with_dollar as example3
FROM currency_tests;

-- 6. Reset to Saudi Riyal for normal operation (optional)
-- Uncomment the next lines if you want to reset to Saudi Riyal
-- UPDATE company_config 
-- SET currency_symbol = 'ر.س' 
-- WHERE currency_symbol = 'none';

-- 7. Final verification
SELECT 
  'Final Configuration:' as result,
  currency_symbol,
  CASE 
    WHEN currency_symbol = 'none' THEN 'Numbers will be displayed without currency symbol'
    ELSE 'Numbers will be displayed with currency symbol: ' || currency_symbol
  END as display_format
FROM company_config 
ORDER BY created_at DESC 
LIMIT 1;
