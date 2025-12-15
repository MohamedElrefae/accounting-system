-- ============================================
-- SIMPLE OPENING BALANCE CHECK
-- ============================================

-- 1. See what columns exist in opening_balance_imports
SELECT * FROM opening_balance_imports LIMIT 1;

-- 2. Count fiscal years
SELECT 
  COUNT(*) as total_fiscal_years,
  STRING_AGG(year_number::text, ', ' ORDER BY year_number) as years
FROM fiscal_years;

-- 3. Count opening balance imports
SELECT COUNT(*) as total_imports FROM opening_balance_imports;

-- 4. Check if imports reference missing fiscal years
SELECT 
  obi.id,
  obi.fiscal_year_id,
  obi.status,
  obi.created_at,
  CASE 
    WHEN fy.id IS NULL THEN '❌ MISSING FISCAL YEAR'
    ELSE '✓ Fiscal Year: ' || fy.year_number
  END as fiscal_year_status
FROM opening_balance_imports obi
LEFT JOIN fiscal_years fy ON fy.id = obi.fiscal_year_id
ORDER BY obi.created_at DESC;

-- 5. Count opening balances by fiscal year
SELECT 
  COALESCE(fy.year_number::text, 'MISSING') as year,
  COUNT(*) as balance_count
FROM opening_balances ob
LEFT JOIN fiscal_years fy ON fy.id = ob.fiscal_year_id
GROUP BY fy.year_number
ORDER BY fy.year_number DESC NULLS LAST;
