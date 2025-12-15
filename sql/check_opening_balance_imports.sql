-- ============================================
-- CHECK OPENING BALANCE IMPORTS
-- See what fiscal years are referenced in imports
-- ============================================

-- 1. Check all opening balance imports
SELECT 
  id,
  fiscal_year_id,
  org_id,
  status,
  total_rows,
  success_rows,
  error_rows,
  created_at
FROM opening_balance_imports
ORDER BY created_at DESC;

-- 2. Check which fiscal years are referenced
SELECT 
  obi.fiscal_year_id,
  COUNT(*) as import_count,
  SUM(obi.total_rows) as total_rows_imported,
  SUM(obi.success_rows) as success_rows,
  SUM(obi.error_rows) as error_rows,
  fy.year_number,
  fy.name_en,
  CASE 
    WHEN fy.id IS NULL THEN 'MISSING FISCAL YEAR ❌'
    ELSE 'Fiscal Year Exists ✓'
  END as fiscal_year_status
FROM opening_balance_imports obi
LEFT JOIN fiscal_years fy ON fy.id = obi.fiscal_year_id
GROUP BY obi.fiscal_year_id, fy.year_number, fy.name_en, fy.id
ORDER BY fy.year_number DESC NULLS LAST;

-- 3. Find orphaned imports (imports without fiscal year)
SELECT 
  obi.id as import_id,
  obi.fiscal_year_id,
  obi.status,
  obi.total_rows,
  obi.created_at,
  'ORPHANED - Fiscal year does not exist' as issue
FROM opening_balance_imports obi
LEFT JOIN fiscal_years fy ON fy.id = obi.fiscal_year_id
WHERE fy.id IS NULL;

-- 4. Check opening balance entries
SELECT 
  ob.id,
  ob.fiscal_year_id,
  ob.account_code,
  ob.opening_balance_debit,
  ob.opening_balance_credit,
  fy.year_number,
  CASE 
    WHEN fy.id IS NULL THEN 'MISSING FISCAL YEAR ❌'
    ELSE 'OK ✓'
  END as status
FROM opening_balances ob
LEFT JOIN fiscal_years fy ON fy.id = ob.fiscal_year_id
LIMIT 100;

-- 5. Summary by fiscal year
SELECT 
  COALESCE(fy.year_number::text, 'MISSING') as year,
  COALESCE(fy.name_en, 'No Fiscal Year') as fiscal_year_name,
  COUNT(DISTINCT ob.id) as balance_entries,
  SUM(ob.opening_balance_debit) as total_debit,
  SUM(ob.opening_balance_credit) as total_credit
FROM opening_balances ob
LEFT JOIN fiscal_years fy ON fy.id = ob.fiscal_year_id
GROUP BY fy.year_number, fy.name_en
ORDER BY fy.year_number DESC NULLS LAST;

-- 6. Check if there are any fiscal years at all
SELECT 
  COUNT(*) as fiscal_year_count,
  STRING_AGG(year_number::text, ', ' ORDER BY year_number) as years
FROM fiscal_years;
