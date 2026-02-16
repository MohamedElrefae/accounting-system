-- ============================================================================
-- DIAGNOSE AND CLEANUP TRANSACTION LINES
-- ============================================================================
-- Run this to check current state and clean up before importing
-- ============================================================================

-- Step 1: Check current state
SELECT 
    'Current State' as status,
    COUNT(*) as total_lines,
    SUM(debit_amount) as total_debit,
    SUM(credit_amount) as total_credit,
    SUM(debit_amount) - SUM(credit_amount) as balance,
    COUNT(DISTINCT transaction_id) as unique_transactions
FROM transaction_lines tl
JOIN transactions t ON tl.transaction_id = t.id
WHERE t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Step 2: Check for duplicate lines (same transaction + line_no)
SELECT 
    'Duplicate Check' as status,
    transaction_id,
    line_no,
    COUNT(*) as duplicate_count
FROM transaction_lines tl
JOIN transactions t ON tl.transaction_id = t.id
WHERE t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
GROUP BY transaction_id, line_no
HAVING COUNT(*) > 1
LIMIT 10;

-- Step 3: Check dimension mapping
SELECT 
    'Dimension Coverage' as status,
    COUNT(*) as total_lines,
    COUNT(classification_id) as with_classification,
    COUNT(project_id) as with_project,
    COUNT(analysis_work_item_id) as with_analysis,
    COUNT(sub_tree_id) as with_subtree,
    ROUND(COUNT(classification_id)::NUMERIC / COUNT(*) * 100, 1) as classification_pct,
    ROUND(COUNT(project_id)::NUMERIC / COUNT(*) * 100, 1) as project_pct,
    ROUND(COUNT(analysis_work_item_id)::NUMERIC / COUNT(*) * 100, 1) as analysis_pct,
    ROUND(COUNT(sub_tree_id)::NUMERIC / COUNT(*) * 100, 1) as subtree_pct
FROM transaction_lines tl
JOIN transactions t ON tl.transaction_id = t.id
WHERE t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- ============================================================================
-- CLEANUP: Delete all transaction lines for this org
-- ============================================================================
-- WARNING: This will delete ALL transaction lines for your organization
-- Only run this if you want to start fresh
-- ============================================================================

-- Uncomment the lines below to perform cleanup:

/*
DO $$
DECLARE
    v_deleted INTEGER;
BEGIN
    -- Delete transaction lines
    DELETE FROM transaction_lines tl
    USING transactions t
    WHERE tl.transaction_id = t.id
    AND t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'CLEANUP COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Deleted % transaction lines', v_deleted;
    RAISE NOTICE '';
    RAISE NOTICE 'You can now import the 20 SQL files';
    RAISE NOTICE '';
END $$;
*/

-- ============================================================================
-- After cleanup, verify the table is empty
-- ============================================================================

/*
SELECT 
    'After Cleanup' as status,
    COUNT(*) as remaining_lines
FROM transaction_lines tl
JOIN transactions t ON tl.transaction_id = t.id
WHERE t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
*/
