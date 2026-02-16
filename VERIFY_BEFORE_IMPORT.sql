-- ========================================
-- PRE-IMPORT VERIFICATION
-- Check current state before importing
-- ========================================

-- 1. Check current transaction lines count
SELECT 
    'Current transaction lines' as check_type,
    COUNT(*) as count
FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- 2. Check current balance totals
SELECT 
    'Current balance totals' as check_type,
    SUM(debit_amount) as total_debits,
    SUM(credit_amount) as total_credits,
    SUM(debit_amount) - SUM(credit_amount) as difference
FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- 3. Check transactions count
SELECT 
    'Transactions count' as check_type,
    COUNT(*) as count
FROM transactions 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- 4. Check for duplicate line numbers per transaction
SELECT 
    'Duplicate line numbers check' as check_type,
    COUNT(*) as duplicate_combinations
FROM (
    SELECT transaction_id, line_no, COUNT(*) as cnt
    FROM transaction_lines
    WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
    GROUP BY transaction_id, line_no
    HAVING COUNT(*) > 1
) duplicates;

-- 5. Check transactions with lines
SELECT 
    'Transactions with lines' as check_type,
    COUNT(DISTINCT transaction_id) as count
FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- 6. Check transactions without lines
SELECT 
    'Transactions without lines' as check_type,
    COUNT(*) as count
FROM transactions t
WHERE t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
AND NOT EXISTS (
    SELECT 1 FROM transaction_lines tl 
    WHERE tl.transaction_id = t.id
);

-- ========================================
-- EXPECTED VALUES (from Excel source)
-- ========================================
-- Total lines in Excel: 14,161
-- Expected valid lines after filtering: ~14,161 (100% valid accounts)
-- Expected balance total: 905,925,674.8
-- Expected transactions: 2,962
-- Expected transactions with lines: 2,962
-- Expected transactions without lines: 0
-- ========================================
