-- Test SQL to verify Excel export formatting
-- Run this in your database to get sample data for testing Excel export

-- Test currency and number formatting
SELECT 
    '1001' as account_code,
    'النقدية في الصندوق' as account_name,
    25000.50 as balance_amount,
    150.75 as small_amount,
    0.00 as zero_amount,
    -5000.25 as negative_amount,
    CURRENT_DATE as transaction_date,
    NOW() as created_at,
    true as is_active,
    0.15 as percentage_value -- 15%
    
UNION ALL

SELECT 
    '1002' as account_code,
    'البنك الأهلي' as account_name,
    1500000.00 as balance_amount,
    999.99 as small_amount,
    0.00 as zero_amount,
    -15000.00 as negative_amount,
    CURRENT_DATE - INTERVAL '7 days' as transaction_date,
    NOW() - INTERVAL '1 hour' as created_at,
    true as is_active,
    0.25 as percentage_value -- 25%

UNION ALL

SELECT 
    '2001' as account_code,
    'الموردون' as account_name,
    45000.00 as balance_amount,
    0.01 as small_amount,
    0.00 as zero_amount,
    -500.50 as negative_amount,
    CURRENT_DATE - INTERVAL '30 days' as transaction_date,
    NOW() - INTERVAL '2 hours' as created_at,
    false as is_active,
    0.08 as percentage_value -- 8%
;

-- Instructions for testing Excel export:
-- 1. Export this data using the universal export system
-- 2. Verify that:
--    - balance_amount, small_amount, zero_amount, negative_amount show as numbers in Excel (not text)
--    - transaction_date and created_at show as proper dates in Excel
--    - is_active shows as TRUE/FALSE boolean values
--    - percentage_value shows as percentage format (15%, 25%, 8%)
--    - Negative amounts display correctly with proper formatting
--    - Zero amounts display as 0.00 (not as text)
