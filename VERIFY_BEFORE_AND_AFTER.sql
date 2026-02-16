-- ============================================================================
-- VERIFY BEFORE AND AFTER FIX
-- ============================================================================
-- Run this BEFORE and AFTER fixing duplicates to see the difference
-- ============================================================================

-- ============================================================================
-- SECTION 1: CURRENT STATE
-- ============================================================================

-- 1.1: Transaction counts
SELECT 
    'Current State' as status,
    COUNT(*) as total_transactions,
    COUNT(DISTINCT reference_number) as unique_references,
    COUNT(*) - COUNT(DISTINCT reference_number) as duplicate_count,
    ROUND((COUNT(*) - COUNT(DISTINCT reference_number))::NUMERIC / COUNT(*) * 100, 1) as duplicate_pct
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- 1.2: Sample duplicates (first 10)
SELECT 
    'Sample Duplicates' as info,
    reference_number,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ' ORDER BY created_at) as transaction_ids
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
GROUP BY reference_number
HAVING COUNT(*) > 1
ORDER BY reference_number::INTEGER
LIMIT 10;

-- 1.3: Transaction lines count
SELECT 
    'Transaction Lines' as info,
    COUNT(*) as total_lines,
    SUM(debit_amount) as total_debit,
    SUM(credit_amount) as total_credit,
    SUM(debit_amount) - SUM(credit_amount) as balance
FROM transaction_lines
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- ============================================================================
-- SECTION 2: EXPECTED STATE (After Fix)
-- ============================================================================

SELECT 
    'Expected After Fix' as status,
    2161 as expected_transactions,
    2161 as expected_unique_refs,
    0 as expected_duplicates,
    13963 as expected_lines_after_reimport,
    905925674.84 as expected_debit,
    905925674.84 as expected_credit,
    0.00 as expected_balance;

-- ============================================================================
-- SECTION 3: DETAILED DUPLICATE ANALYSIS
-- ============================================================================

-- 3.1: Count of duplicates by frequency
SELECT 
    'Duplicate Frequency' as info,
    duplicate_count,
    COUNT(*) as reference_numbers_with_this_count,
    duplicate_count * COUNT(*) as total_transactions_affected
FROM (
    SELECT 
        reference_number,
        COUNT(*) as duplicate_count
    FROM transactions
    WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
    GROUP BY reference_number
    HAVING COUNT(*) > 1
) dup_counts
GROUP BY duplicate_count
ORDER BY duplicate_count;

-- 3.2: Total duplicates to be deleted
SELECT 
    'Duplicates to Delete' as info,
    SUM(duplicate_count - 1) as will_be_deleted,
    COUNT(DISTINCT reference_number) as will_be_kept
FROM (
    SELECT 
        reference_number,
        COUNT(*) as duplicate_count
    FROM transactions
    WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
    GROUP BY reference_number
    HAVING COUNT(*) > 1
) dup_counts;

-- ============================================================================
-- SECTION 4: IMPACT ON TRANSACTION LINES
-- ============================================================================

-- 4.1: How many lines are affected by duplicates
SELECT 
    'Lines Affected by Duplicates' as info,
    COUNT(DISTINCT tl.id) as affected_lines,
    COUNT(DISTINCT tl.transaction_id) as affected_transactions,
    SUM(tl.debit_amount) as affected_debit,
    SUM(tl.credit_amount) as affected_credit
FROM transaction_lines tl
JOIN transactions t ON tl.transaction_id = t.id
WHERE t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
AND t.reference_number IN (
    SELECT reference_number
    FROM transactions
    WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
    GROUP BY reference_number
    HAVING COUNT(*) > 1
);

-- ============================================================================
-- SECTION 5: VERIFICATION QUERIES (Run After Fix)
-- ============================================================================

-- 5.1: Verify no duplicates remain
SELECT 
    'After Fix Verification' as status,
    COUNT(*) as total_transactions,
    COUNT(DISTINCT reference_number) as unique_references,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT reference_number) THEN '✅ NO DUPLICATES'
        ELSE '❌ DUPLICATES STILL EXIST'
    END as duplicate_status
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- 5.2: Verify transaction lines are deleted
SELECT 
    'Transaction Lines After Cleanup' as status,
    COUNT(*) as remaining_lines,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ READY FOR REIMPORT'
        ELSE '❌ NEED TO DELETE LINES'
    END as ready_status
FROM transaction_lines
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- ============================================================================
-- SECTION 6: REFERENCE NUMBER FORMAT CHECK
-- ============================================================================

-- 6.1: Check reference number format
SELECT 
    'Reference Format' as info,
    MIN(reference_number) as min_ref,
    MAX(reference_number) as max_ref,
    MIN(LENGTH(reference_number)) as min_length,
    MAX(LENGTH(reference_number)) as max_length,
    COUNT(DISTINCT LENGTH(reference_number)) as different_lengths
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- 6.2: Sample reference numbers
SELECT 
    'Sample References' as info,
    reference_number,
    LENGTH(reference_number) as length,
    reference_number::INTEGER as as_integer
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY reference_number::INTEGER
LIMIT 20;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================

/*

HOW TO USE THIS FILE:
---------------------

1. BEFORE FIX:
   - Run this entire file
   - Note the "Current State" results
   - Should show: 2,958 total, 2,161 unique, 797 duplicates

2. RUN THE FIX:
   - Run: FIX_DUPLICATE_TRANSACTIONS_FINAL.sql
   - Should delete 797 transactions, keep 2,161

3. AFTER FIX:
   - Run this file again
   - Section 5 should show: ✅ NO DUPLICATES
   - Section 5 should show: ✅ READY FOR REIMPORT (if lines deleted)

4. REIMPORT:
   - Run all 20 transaction_lines files
   - Part 01 should show 699 lines (not 1,030)
   - Final total should be 13,963 lines

*/
