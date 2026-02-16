-- ============================================================================
-- FIX DUPLICATE TRANSACTIONS - KEEP ONLY ONE PER REFERENCE_NUMBER
-- ============================================================================
-- This removes duplicate transactions, keeping the first one for each reference_number
-- ============================================================================

-- Step 1: Show the duplicate situation
SELECT 
    'Duplicate Transactions' as issue,
    reference_number,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(id::text ORDER BY created_at) as transaction_ids
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
GROUP BY reference_number
HAVING COUNT(*) > 1
ORDER BY reference_number::INTEGER
LIMIT 20;

-- Step 2: Delete duplicate transactions (keep the oldest one)
DO $$
DECLARE
    v_deleted INTEGER := 0;
    v_kept INTEGER := 0;
BEGIN
    -- Delete duplicates, keeping only the first (oldest) transaction for each reference_number
    WITH duplicates AS (
        SELECT 
            id,
            reference_number,
            ROW_NUMBER() OVER (PARTITION BY reference_number ORDER BY created_at, id) as rn
        FROM transactions
        WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
    )
    DELETE FROM transactions
    WHERE id IN (
        SELECT id FROM duplicates WHERE rn > 1
    );
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    -- Count remaining transactions
    SELECT COUNT(*) INTO v_kept
    FROM transactions
    WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'DUPLICATE TRANSACTIONS CLEANUP';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Deleted duplicate transactions: %', v_deleted;
    RAISE NOTICE 'Kept unique transactions: %', v_kept;
    RAISE NOTICE '';
    RAISE NOTICE 'Now you can import transaction_lines';
    RAISE NOTICE '';
END $$;

-- Step 3: Verify no more duplicates
SELECT 
    'After Cleanup' as status,
    COUNT(*) as total_transactions,
    COUNT(DISTINCT reference_number) as unique_references,
    COUNT(*) - COUNT(DISTINCT reference_number) as remaining_duplicates
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
