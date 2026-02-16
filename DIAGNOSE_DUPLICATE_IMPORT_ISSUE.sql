-- Diagnose Why Transaction Lines Are Duplicated Again
-- Expected: 13,963 lines, 905,925,674.84 balanced
-- Actual: 24,165 lines, unbalanced

-- 1. Check if SQL files were run multiple times
SELECT 
    transaction_id,
    line_no,
    COUNT(*) as duplicate_count
FROM transaction_lines
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
GROUP BY transaction_id, line_no
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;
-- If this shows duplicates, the SQL files were run multiple times

-- 2. Check line_no distribution per transaction
SELECT 
    transaction_id,
    COUNT(*) as line_count,
    MIN(line_no) as min_line_no,
    MAX(line_no) as max_line_no
FROM transaction_lines
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
GROUP BY transaction_id
ORDER BY line_count DESC
LIMIT 20;
-- If max_line_no is much higher than line_count, files were run multiple times

-- 3. Check for exact duplicate rows (same data, different line_no)
SELECT 
    transaction_id,
    account_id,
    debit_amount,
    credit_amount,
    description,
    COUNT(*) as duplicate_count
FROM transaction_lines
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
GROUP BY transaction_id, account_id, debit_amount, credit_amount, description
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;
-- If this shows many duplicates, the same data was imported multiple times

-- 4. Check total counts
SELECT 
    'Transaction Lines' as table_name,
    COUNT(*) as total_count,
    COUNT(DISTINCT transaction_id) as unique_transactions,
    SUM(debit_amount) as total_debit,
    SUM(credit_amount) as total_credit,
    SUM(debit_amount) - SUM(credit_amount) as balance
FROM transaction_lines
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- 5. Check if there are lines with zero amounts (should have been filtered)
SELECT 
    COUNT(*) as zero_amount_lines
FROM transaction_lines
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND debit_amount = 0 
  AND credit_amount = 0;
-- Should be 0

-- 6. Check if there are lines with invalid account_id (should have been filtered)
SELECT 
    COUNT(*) as invalid_account_lines
FROM transaction_lines
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND (account_id IS NULL OR account_id = '00000000-0000-0000-0000-000000000000');
-- Should be 0

-- SOLUTION:
-- You need to DELETE all transaction_lines and re-import with the corrected SQL files
-- The old SQL files were run multiple times, causing duplicates

-- DELETE COMMAND (run this first):
-- DELETE FROM transaction_lines WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Then re-import all 28 SQL files in order (only once each!)
