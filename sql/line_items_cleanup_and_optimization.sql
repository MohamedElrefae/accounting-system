-- =====================================================
-- LINE ITEMS SYSTEM CLEANUP AND OPTIMIZATION
-- =====================================================

-- STEP 1: CHECK CURRENT STATE
-- =====================================================

-- Check what line item tables exist
SELECT 'TABLE CHECK' as step, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%line%item%'
ORDER BY table_name;

-- Check current functions
SELECT 'FUNCTION CHECK' as step, 
    routine_name as function_name,
    routine_type,
    data_type as return_type,
    specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'fn_line_item%'
ORDER BY routine_name;

-- STEP 2: GET ACTUAL TABLE STRUCTURE
-- =====================================================

-- Get transaction_line_items table structure (used by frontend)
SELECT 'TRANSACTION_LINE_ITEMS STRUCTURE' as step,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if line_items table exists (may be unused)
SELECT 'LINE_ITEMS STRUCTURE' as step,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'line_items' AND table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as table_status;

-- If line_items exists, show its structure
SELECT 'LINE_ITEMS COLUMNS' as step,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'line_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 3: CLEANUP DUPLICATE AND UNUSED FUNCTIONS
-- =====================================================

-- Drop old void-returning functions (duplicates)
DROP FUNCTION IF EXISTS fn_line_item_delete(UUID);  -- void version
DROP FUNCTION IF EXISTS fn_line_item_update(UUID, VARCHAR, VARCHAR, DECIMAL, DECIMAL, DECIMAL, DECIMAL); -- if void version exists

-- Drop unused functions that don't match frontend usage
DROP FUNCTION IF EXISTS fn_line_item_create(UUID, VARCHAR, VARCHAR, DECIMAL, DECIMAL, DECIMAL, DECIMAL, BOOLEAN);
DROP FUNCTION IF EXISTS fn_line_item_level_for(UUID);

-- STEP 4: KEEP ONLY RELEVANT FUNCTIONS (IF NEEDED FOR REPORTING)
-- =====================================================

-- Since frontend uses TransactionLineItemsService, we'll create functions 
-- that work with transaction_line_items table for reporting/batch operations

-- Function to get line items by transaction (for reporting)
DROP FUNCTION IF EXISTS fn_transaction_line_items_get(UUID);

CREATE OR REPLACE FUNCTION fn_transaction_line_items_get(
    p_transaction_id UUID
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_line_items JSON;
    v_summary JSON;
    v_total_amount DECIMAL(10,2);
    v_item_count INTEGER;
BEGIN
    -- Get line items with calculations
    SELECT 
        json_agg(
            json_build_object(
                'id', tli.id,
                'line_number', tli.line_number,
                'item_code', tli.item_code,
                'item_name', tli.item_name,
                'item_name_ar', tli.item_name_ar,
                'description', tli.description,
                'description_ar', tli.description_ar,
                'quantity', tli.quantity,
                'percentage', tli.percentage,
                'unit_price', tli.unit_price,
                'discount_amount', tli.discount_amount,
                'tax_amount', tli.tax_amount,
                'unit_of_measure', tli.unit_of_measure,
                'calculated_total', (
                    COALESCE(tli.quantity, 0) * 
                    COALESCE(tli.unit_price, 0) * 
                    (COALESCE(tli.percentage, 100) / 100.0) - 
                    COALESCE(tli.discount_amount, 0) + 
                    COALESCE(tli.tax_amount, 0)
                ),
                'analysis_work_item_id', tli.analysis_work_item_id,
                'sub_tree_id', tli.sub_tree_id,
                'line_item_id', tli.line_item_id,
                'created_at', tli.created_at,
                'updated_at', tli.updated_at
            ) ORDER BY tli.line_number, tli.id
        ),
        SUM(
            COALESCE(tli.quantity, 0) * 
            COALESCE(tli.unit_price, 0) * 
            (COALESCE(tli.percentage, 100) / 100.0) - 
            COALESCE(tli.discount_amount, 0) + 
            COALESCE(tli.tax_amount, 0)
        ),
        COUNT(*)
    INTO v_line_items, v_total_amount, v_item_count
    FROM transaction_line_items tli
    WHERE tli.transaction_id = p_transaction_id;
    
    -- Build summary
    v_summary := json_build_object(
        'transaction_id', p_transaction_id,
        'total_line_items', COALESCE(v_item_count, 0),
        'total_calculated_amount', COALESCE(v_total_amount, 0)
    );
    
    -- Build result
    v_result := json_build_object(
        'success', TRUE,
        'message', 'Transaction line items retrieved successfully',
        'summary', v_summary,
        'line_items', COALESCE(v_line_items, '[]'::JSON)
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'message', 'Error retrieving transaction line items: ' || SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- Function to validate line item calculations
DROP FUNCTION IF EXISTS fn_validate_line_item_calculations(UUID);

CREATE OR REPLACE FUNCTION fn_validate_line_item_calculations(
    p_transaction_id UUID
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_validation_results JSON;
    v_issues_count INTEGER := 0;
BEGIN
    -- Check for calculation discrepancies
    SELECT 
        json_agg(
            json_build_object(
                'id', tli.id,
                'line_number', tli.line_number,
                'item_name', COALESCE(tli.item_name, tli.item_name_ar),
                'stored_total', tli.total_amount,
                'calculated_total', (
                    COALESCE(tli.quantity, 0) * 
                    COALESCE(tli.unit_price, 0) * 
                    (COALESCE(tli.percentage, 100) / 100.0) - 
                    COALESCE(tli.discount_amount, 0) + 
                    COALESCE(tli.tax_amount, 0)
                ),
                'difference', ABS(
                    COALESCE(tli.total_amount, 0) - (
                        COALESCE(tli.quantity, 0) * 
                        COALESCE(tli.unit_price, 0) * 
                        (COALESCE(tli.percentage, 100) / 100.0) - 
                        COALESCE(tli.discount_amount, 0) + 
                        COALESCE(tli.tax_amount, 0)
                    )
                ),
                'has_issue', ABS(
                    COALESCE(tli.total_amount, 0) - (
                        COALESCE(tli.quantity, 0) * 
                        COALESCE(tli.unit_price, 0) * 
                        (COALESCE(tli.percentage, 100) / 100.0) - 
                        COALESCE(tli.discount_amount, 0) + 
                        COALESCE(tli.tax_amount, 0)
                    )
                ) > 0.01
            )
        ),
        COUNT(CASE WHEN ABS(
            COALESCE(tli.total_amount, 0) - (
                COALESCE(tli.quantity, 0) * 
                COALESCE(tli.unit_price, 0) * 
                (COALESCE(tli.percentage, 100) / 100.0) - 
                COALESCE(tli.discount_amount, 0) + 
                COALESCE(tli.tax_amount, 0)
            )
        ) > 0.01 THEN 1 END)
    INTO v_validation_results, v_issues_count
    FROM transaction_line_items tli
    WHERE tli.transaction_id = p_transaction_id;
    
    v_result := json_build_object(
        'success', TRUE,
        'message', 'Validation completed',
        'transaction_id', p_transaction_id,
        'issues_found', v_issues_count,
        'validation_results', COALESCE(v_validation_results, '[]'::JSON)
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'message', 'Error validating calculations: ' || SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- STEP 5: OPTIMIZE EXISTING TRANSACTION_LINE_ITEMS TABLE
-- =====================================================

-- Check if calculation trigger exists
SELECT 'TRIGGER CHECK' as step,
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'transaction_line_items'
AND trigger_schema = 'public';

-- Create/Update calculation trigger if needed
CREATE OR REPLACE FUNCTION calculate_transaction_line_item_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total_amount using the formula: quantity * (percentage/100) * unit_price - discount + tax
    NEW.total_amount := COALESCE(NEW.quantity, 0) * 
                       COALESCE(NEW.unit_price, 0) * 
                       (COALESCE(NEW.percentage, 100) / 100.0) - 
                       COALESCE(NEW.discount_amount, 0) + 
                       COALESCE(NEW.tax_amount, 0);
    
    -- Update timestamp on changes
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at := CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_calculate_transaction_line_item_total ON transaction_line_items;

-- Create the trigger
CREATE TRIGGER trigger_calculate_transaction_line_item_total
    BEFORE INSERT OR UPDATE ON transaction_line_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_transaction_line_item_total();

-- STEP 6: CREATE USEFUL INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for transaction lookups (main query pattern)
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_transaction_id 
ON transaction_line_items (transaction_id);

-- Index for line number ordering
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_transaction_line_number 
ON transaction_line_items (transaction_id, line_number);

-- Index for analysis work item lookups
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_analysis_work_item 
ON transaction_line_items (analysis_work_item_id) 
WHERE analysis_work_item_id IS NOT NULL;

-- Index for sub_tree (expense category) lookups  
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_sub_tree 
ON transaction_line_items (sub_tree_id) 
WHERE sub_tree_id IS NOT NULL;

-- Index for organization scoped queries
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_org_id 
ON transaction_line_items (org_id);

-- STEP 7: FINAL VERIFICATION
-- =====================================================

-- List remaining functions after cleanup
SELECT 'FINAL FUNCTIONS' as step,
    routine_name as function_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%line_item%'
ORDER BY routine_name;

-- Check indexes created
SELECT 'INDEXES CHECK' as step,
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename = 'transaction_line_items'
AND schemaname = 'public'
ORDER BY indexname;

-- Check triggers
SELECT 'TRIGGERS CHECK' as step,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'transaction_line_items'
AND trigger_schema = 'public';

-- Summary report
SELECT 'CLEANUP SUMMARY' as step, 'Cleanup and optimization completed successfully!' as status
UNION ALL
SELECT 'RECOMMENDATION' as step, 'Your TransactionLineItemsService is well-designed and should continue to be your primary interface' as status
UNION ALL
SELECT 'NEW FUNCTIONS' as step, 'Added fn_transaction_line_items_get and fn_validate_line_item_calculations for reporting' as status
UNION ALL
SELECT 'PERFORMANCE' as step, 'Added optimized indexes and calculation trigger' as status;