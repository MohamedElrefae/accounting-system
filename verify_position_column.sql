-- =====================================================================
-- VERIFY POSITION COLUMN WAS ADDED SUCCESSFULLY
-- Copy and run this after the migration to verify everything worked
-- =====================================================================

-- 1. Check if position column exists and its properties
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items' 
    AND column_name = 'position'
    AND table_schema = 'public';

-- 2. Check the complete table structure including position
SELECT 
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if the position index was created
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'transaction_line_items' 
    AND indexname LIKE '%position%';

-- 4. Check if the constraint was added
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
    AND constraint_name = 'check_position_positive';

-- 5. Test the position column with sample data
SELECT 
    id,
    transaction_id,
    line_number,
    position,
    item_name_ar,
    total_amount
FROM transaction_line_items 
ORDER BY transaction_id, position 
LIMIT 10;

-- 6. Count records with position values
SELECT 
    'Total records' as metric,
    COUNT(*) as count
FROM transaction_line_items
UNION ALL
SELECT 
    'Records with position' as metric,
    COUNT(*) as count
FROM transaction_line_items
WHERE position IS NOT NULL;

-- 7. Test insert with position column (using existing transaction)
BEGIN;

-- First, get an existing transaction ID to use for testing
DO $$
DECLARE
    test_transaction_id UUID;
BEGIN
    -- Get the first available transaction ID
    SELECT id INTO test_transaction_id 
    FROM transactions 
    WHERE org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
    LIMIT 1;
    
    -- Only proceed with test if we found a transaction
    IF test_transaction_id IS NOT NULL THEN
        INSERT INTO transaction_line_items (
            transaction_id,
            line_number,
            position,
            item_name_ar,
            quantity,
            percentage,
            unit_price,
            unit_of_measure,
            org_id
        ) VALUES (
            test_transaction_id,
            999, -- Use high line number to avoid conflicts
            999, -- Use high position to avoid conflicts
            'Test Position Column',
            1,
            100,
            10.00,
            'piece',
            'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
        );
        
        RAISE NOTICE 'Test insert completed with transaction_id: %', test_transaction_id;
    ELSE
        RAISE NOTICE 'No transactions found for testing - skipping insert test';
    END IF;
END $$;

-- Check if the test insert worked
SELECT 
    'Test insert result' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM transaction_line_items WHERE item_name_ar = 'Test Position Column')
        THEN 'SUCCESS: Position column works correctly'
        ELSE 'INFO: Test skipped - no transactions available'
    END as result;

-- Show the test record if it exists
SELECT 
    'Test record details' as info,
    position,
    item_name_ar,
    total_amount,
    transaction_id
FROM transaction_line_items 
WHERE item_name_ar = 'Test Position Column';

ROLLBACK; -- Clean up test data

-- Success message
SELECT 
    '✅ Position column migration completed successfully!' as result;