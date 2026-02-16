-- Fix Duplicate Transactions Issue
-- This removes duplicate transactions keeping only the first one

-- Step 1: Identify duplicates
WITH duplicates AS (
    SELECT 
        reference_number,
        entry_number,
        MIN(id::text)::uuid as keep_id,
        ARRAY_AGG(id::text ORDER BY id::text) as all_ids,
        COUNT(*) as count
    FROM transactions
    WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid
    GROUP BY reference_number, entry_number
    HAVING COUNT(*) > 1
)
SELECT 
    reference_number,
    entry_number,
    count as duplicate_count,
    keep_id,
    all_ids
FROM duplicates
ORDER BY count DESC;

-- Step 2: Delete transaction_lines for duplicate transactions (keep only first)
WITH duplicates AS (
    SELECT 
        reference_number,
        MIN(id::text)::uuid as keep_id,
        ARRAY_AGG(id::text ORDER BY id::text) as all_ids
    FROM transactions
    WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid
    GROUP BY reference_number
    HAVING COUNT(*) > 1
),
ids_to_delete AS (
    SELECT UNNEST(all_ids[2:])::uuid as transaction_id
    FROM duplicates
)
DELETE FROM transaction_lines
WHERE transaction_id IN (SELECT transaction_id FROM ids_to_delete);

-- Step 3: Delete duplicate transactions (keep only first)
WITH duplicates AS (
    SELECT 
        reference_number,
        MIN(id::text)::uuid as keep_id,
        ARRAY_AGG(id::text ORDER BY id::text) as all_ids
    FROM transactions
    WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid
    GROUP BY reference_number
    HAVING COUNT(*) > 1
),
ids_to_delete AS (
    SELECT UNNEST(all_ids[2:])::uuid as transaction_id
    FROM duplicates
)
DELETE FROM transactions
WHERE id IN (SELECT transaction_id FROM ids_to_delete);

-- Step 4: Verify cleanup
SELECT 
    'After Cleanup' as status,
    COUNT(*) as total_transactions,
    COUNT(DISTINCT reference_number) as unique_references
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid;

SELECT 
    'After Cleanup' as status,
    COUNT(*) as total_lines,
    SUM(debit_amount) as total_debit,
    SUM(credit_amount) as total_credit,
    SUM(debit_amount) - SUM(credit_amount) as balance
FROM transaction_lines tl
JOIN transactions t ON tl.transaction_id = t.id
WHERE t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid;
