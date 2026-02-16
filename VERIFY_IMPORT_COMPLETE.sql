-- Comprehensive Transaction Lines Import Verification
-- Run this in Supabase SQL Editor to check import status

-- ============================================
-- 1. OVERALL IMPORT SUMMARY
-- ============================================
SELECT 
    '=== IMPORT SUMMARY ===' as section,
    COUNT(*) as total_lines_imported,
    COUNT(DISTINCT transaction_id) as unique_transactions_with_lines,
    MIN(line_no) as min_line_no,
    MAX(line_no) as max_line_no,
    SUM(debit_amount) as total_debits,
    SUM(credit_amount) as total_credits,
    ABS(SUM(debit_amount) - SUM(credit_amount)) as balance_difference,
    CASE 
        WHEN ABS(SUM(debit_amount) - SUM(credit_amount)) < 1.00
        THEN '✅ BALANCED' 
        ELSE '❌ UNBALANCED' 
    END as balance_status
FROM transaction_lines
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- ============================================
-- 2. EXPECTED VS ACTUAL
-- ============================================
SELECT 
    '=== EXPECTED VS ACTUAL ===' as section,
    14224 as total_lines_in_csv,
    (261 + 497 - 50) as estimated_excluded_lines,
    (14224 - (261 + 497 - 50)) as expected_valid_lines,
    (SELECT COUNT(*) FROM transaction_lines WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114') as actual_imported_lines,
    (14224 - (261 + 497 - 50)) - (SELECT COUNT(*) FROM transaction_lines WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114') as difference;

-- ============================================
-- 3. TRANSACTIONS WITH/WITHOUT LINES
-- ============================================
SELECT 
    '=== TRANSACTION COVERAGE ===' as section,
    (SELECT COUNT(*) FROM transactions WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114') as total_transactions,
    (SELECT COUNT(DISTINCT transaction_id) FROM transaction_lines WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114') as transactions_with_lines,
    (SELECT COUNT(*) FROM transactions WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114') - 
    (SELECT COUNT(DISTINCT transaction_id) FROM transaction_lines WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114') as transactions_without_lines;

-- ============================================
-- 4. LINE NUMBER DISTRIBUTION (Check for duplicates)
-- ============================================
SELECT 
    '=== LINE NUMBER CHECK ===' as section,
    COUNT(*) as total_combinations,
    SUM(CASE WHEN line_count > 1 THEN 1 ELSE 0 END) as duplicate_line_numbers,
    MAX(line_count) as max_duplicates_for_same_line_no
FROM (
    SELECT transaction_id, line_no, COUNT(*) as line_count
    FROM transaction_lines
    WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
    GROUP BY transaction_id, line_no
) sub;

-- ============================================
-- 5. SAMPLE TRANSACTIONS WITH LINE COUNTS
-- ============================================
SELECT 
    '=== SAMPLE TRANSACTIONS ===' as section,
    t.reference_number,
    t.description,
    COUNT(tl.id) as line_count,
    SUM(tl.debit_amount) as line_debits,
    SUM(tl.credit_amount) as line_credits,
    t.total_debit as transaction_debit,
    t.total_credit as transaction_credit,
    CASE 
        WHEN ABS(t.total_debit - COALESCE(SUM(tl.debit_amount), 0)) < 0.01 
         AND ABS(t.total_credit - COALESCE(SUM(tl.credit_amount), 0)) < 0.01
        THEN '✅ MATCH' 
        ELSE '⚠️ MISMATCH' 
    END as status
FROM transactions t
LEFT JOIN transaction_lines tl ON t.id = tl.transaction_id
WHERE t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
GROUP BY t.id, t.reference_number, t.description, t.total_debit, t.total_credit
ORDER BY t.reference_number::integer
LIMIT 20;

-- ============================================
-- 6. TRANSACTIONS WITHOUT LINES (If any)
-- ============================================
SELECT 
    '=== TRANSACTIONS WITHOUT LINES ===' as section,
    t.reference_number,
    t.description,
    t.total_debit,
    t.total_credit,
    t.transaction_date
FROM transactions t
LEFT JOIN transaction_lines tl ON t.id = tl.transaction_id
WHERE t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND tl.id IS NULL
ORDER BY t.reference_number::integer
LIMIT 20;

-- ============================================
-- 7. ACCOUNT DISTRIBUTION
-- ============================================
SELECT 
    '=== ACCOUNT USAGE ===' as section,
    a.code,
    a.name_ar,
    COUNT(tl.id) as line_count,
    SUM(tl.debit_amount) as total_debits,
    SUM(tl.credit_amount) as total_credits
FROM transaction_lines tl
JOIN accounts a ON tl.account_id = a.id
WHERE tl.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
GROUP BY a.id, a.code, a.name_ar
ORDER BY line_count DESC
LIMIT 10;

-- ============================================
-- 8. FINAL STATUS
-- ============================================
SELECT 
    '=== FINAL STATUS ===' as section,
    CASE 
        WHEN (SELECT COUNT(*) FROM transaction_lines WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114') >= 13500
         AND (SELECT COUNT(*) FROM transaction_lines WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114') <= 13800
         AND ABS((SELECT SUM(debit_amount) - SUM(credit_amount) FROM transaction_lines WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114')) < 1.00
        THEN '✅ IMPORT SUCCESSFUL - All expected lines imported and balanced'
        WHEN (SELECT COUNT(*) FROM transaction_lines WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114') > 13800
        THEN '⚠️ MORE LINES THAN EXPECTED - Check for duplicates'
        WHEN (SELECT COUNT(*) FROM transaction_lines WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114') < 13500
        THEN '⚠️ FEWER LINES THAN EXPECTED - Some files may not have run'
        ELSE '❌ IMPORT INCOMPLETE OR UNBALANCED'
    END as import_status,
    (SELECT COUNT(*) FROM transaction_lines WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114') as actual_lines,
    '13,500-13,800' as expected_range;
