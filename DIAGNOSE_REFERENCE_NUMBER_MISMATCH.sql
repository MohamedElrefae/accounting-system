-- ============================================================================
-- DIAGNOSE REFERENCE NUMBER MISMATCH
-- ============================================================================
-- This checks if transaction reference_numbers match what we expect
-- ============================================================================

-- Step 1: Check what reference_numbers exist in transactions table
SELECT 
    'Transactions Table' as source,
    COUNT(*) as total_count,
    MIN(reference_number) as min_ref,
    MAX(reference_number) as max_ref,
    COUNT(DISTINCT reference_number) as unique_refs
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Step 2: Show sample reference_numbers from transactions
SELECT 
    'Sample References' as info,
    reference_number,
    entry_number,
    entry_date,
    total_debits,
    total_credits
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY reference_number::INTEGER
LIMIT 20;

-- Step 3: Check if reference_numbers are padded with zeros
SELECT 
    'Reference Format Check' as info,
    reference_number,
    LENGTH(reference_number) as ref_length,
    CASE 
        WHEN reference_number ~ '^[0-9]+$' THEN 'Numeric'
        ELSE 'Non-numeric'
    END as format_type
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY reference_number::INTEGER
LIMIT 20;

-- Step 4: Check what the CSV is generating (from Part 01)
-- Expected format from CSV: '1', '2', '3', etc. (no leading zeros)
-- Let's see if transactions have leading zeros like '0001', '0002', etc.

SELECT 
    'Potential Mismatch' as issue,
    reference_number,
    LPAD(reference_number, 4, '0') as padded_4,
    LPAD(reference_number, 5, '0') as padded_5,
    reference_number::INTEGER as as_integer
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
AND reference_number::INTEGER <= 10
ORDER BY reference_number::INTEGER;
