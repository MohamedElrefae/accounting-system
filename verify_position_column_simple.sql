-- =====================================================================
-- SIMPLE VERIFICATION - NO TEST INSERTS REQUIRED  
-- Copy and run this to verify position column was added successfully
-- =====================================================================

-- 1. Check if position column exists
SELECT 
    '✅ Position Column Check' as verification_step,
    CASE 
        WHEN COUNT(*) > 0 THEN 'SUCCESS: Position column exists'
        ELSE '❌ FAILED: Position column not found'
    END as result
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items' 
    AND column_name = 'position'
    AND table_schema = 'public';

-- 2. Show position column properties
SELECT 
    '📋 Column Properties' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items' 
    AND column_name = 'position'
    AND table_schema = 'public';

-- 3. Check if position index was created
SELECT 
    '📊 Index Check' as verification_step,
    CASE 
        WHEN COUNT(*) > 0 THEN 'SUCCESS: Position index created'
        ELSE 'INFO: No position index found'
    END as result
FROM pg_indexes 
WHERE tablename = 'transaction_line_items' 
    AND indexname LIKE '%position%';

-- 4. Check constraint
SELECT 
    '🔒 Constraint Check' as verification_step,
    CASE 
        WHEN COUNT(*) > 0 THEN 'SUCCESS: Position constraint added'
        ELSE 'INFO: No position constraint found'
    END as result
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
    AND constraint_name = 'check_position_positive';

-- 5. Count existing records with position values
SELECT 
    '📈 Data Migration Check' as verification_step,
    CONCAT(
        COUNT(CASE WHEN position IS NOT NULL THEN 1 END), 
        ' out of ', 
        COUNT(*), 
        ' records have position values'
    ) as result
FROM transaction_line_items;

-- 6. Show sample data with position values
SELECT 
    '📄 Sample Data' as info,
    id,
    line_number,
    position,
    item_name_ar,
    CASE 
        WHEN position IS NOT NULL THEN '✅ Has Position'
        ELSE '⚠️ Missing Position'
    END as position_status
FROM transaction_line_items 
ORDER BY created_at DESC
LIMIT 5;

-- 7. Final status
SELECT 
    '🎉 VERIFICATION COMPLETE' as final_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transaction_line_items' 
                AND column_name = 'position'
        ) THEN '✅ Position column is ready for use!'
        ELSE '❌ Migration incomplete - please run the migration script first'
    END as result;