-- Diagnose why Part 01 imported 4,107 lines instead of 2,793

-- 1. Check if there are duplicate transactions with same reference_number
SELECT 
    reference_number,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as transaction_ids
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid
GROUP BY reference_number
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 20;

-- 2. Check total transactions in database
SELECT 
    COUNT(*) as total_transactions,
    COUNT(DISTINCT reference_number) as unique_references
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid;

-- 3. Check if Part 01 data has duplicate txn_ref values
-- Sample check: How many times does '1' appear in Part 01?
SELECT 
    COUNT(*) as count_ref_1
FROM transactions
WHERE reference_number = '1'
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid;

-- 4. Check transaction_lines for reference '1'
SELECT 
    tl.id,
    tl.transaction_id,
    t.reference_number,
    t.entry_number,
    tl.line_no,
    tl.account_id,
    tl.debit_amount,
    tl.credit_amount
FROM transaction_lines tl
JOIN transactions t ON tl.transaction_id = t.id
WHERE t.reference_number = '1'
  AND t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid
ORDER BY tl.line_no;

-- 5. Check if import_transactions.sql was run multiple times
SELECT 
    entry_number,
    reference_number,
    COUNT(*) as count
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid
GROUP BY entry_number, reference_number
HAVING COUNT(*) > 1
LIMIT 20;
