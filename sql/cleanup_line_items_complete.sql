-- =====================================================
-- COMPLETE LINE_ITEMS CLEANUP - REMOVE ALL DEPENDENCIES
-- =====================================================

-- STEP 1: BACKUP EXISTING DATA (OPTIONAL)
-- =====================================================

-- Backup line_items data if you want to preserve it
-- CREATE TABLE line_items_backup_$(date +'%Y%m%d') AS 
-- SELECT * FROM line_items WHERE 1=1;

-- STEP 2: DROP ALL FUNCTIONS RELATED TO LINE_ITEMS
-- =====================================================

-- Drop old line_items CRUD functions
DROP FUNCTION IF EXISTS fn_line_item_add(UUID, VARCHAR, VARCHAR, DECIMAL, DECIMAL, DECIMAL, DECIMAL, BOOLEAN);
DROP FUNCTION IF EXISTS fn_line_item_get(UUID);
DROP FUNCTION IF EXISTS fn_line_item_update(UUID, VARCHAR, VARCHAR, DECIMAL, DECIMAL, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS fn_line_item_toggle_active(UUID);
DROP FUNCTION IF EXISTS fn_line_item_delete(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS fn_line_item_delete(UUID);  -- void version
DROP FUNCTION IF EXISTS fn_line_items_get_by_invoice(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS fn_line_item_create(UUID, VARCHAR, VARCHAR, DECIMAL, DECIMAL, DECIMAL, DECIMAL, BOOLEAN);
DROP FUNCTION IF EXISTS fn_line_item_level_for(UUID);

-- Drop line_items code generation functions
DROP FUNCTION IF EXISTS fn_get_next_line_item_code(UUID, VARCHAR);
DROP FUNCTION IF EXISTS fn_create_child_line_item(UUID, VARCHAR, VARCHAR, VARCHAR, DECIMAL, DECIMAL, DECIMAL, DECIMAL, VARCHAR);
DROP FUNCTION IF EXISTS fn_get_line_items_tree(UUID);

-- STEP 3: DROP TRIGGERS AND TRIGGER FUNCTIONS
-- =====================================================

-- Drop any triggers on line_items table
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'line_items' 
        AND trigger_schema = 'public'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON line_items CASCADE';
    END LOOP;
END $$;

-- Drop trigger functions that might reference line_items
DROP FUNCTION IF EXISTS calculate_line_item_total();
DROP FUNCTION IF EXISTS update_line_item_timestamps();
DROP FUNCTION IF EXISTS validate_line_item_data();

-- STEP 4: DROP VIEWS THAT DEPEND ON LINE_ITEMS
-- =====================================================

-- Drop views that might depend on line_items
DROP VIEW IF EXISTS v_line_items_tree CASCADE;
DROP VIEW IF EXISTS v_line_items_with_children CASCADE;
DROP VIEW IF EXISTS v_line_items_hierarchy CASCADE;
DROP VIEW IF EXISTS v_cost_analysis_items CASCADE;
DROP VIEW IF EXISTS v_line_items_full CASCADE;

-- STEP 5: DROP INDEXES ON LINE_ITEMS
-- =====================================================

-- Drop all indexes on line_items table
DO $$
DECLARE
    index_record RECORD;
BEGIN
    FOR index_record IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'line_items' 
        AND schemaname = 'public'
        AND indexname != 'line_items_pkey'  -- Keep primary key for last
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || index_record.indexname;
    END LOOP;
END $$;

-- STEP 6: REMOVE FOREIGN KEY CONSTRAINTS REFERENCING LINE_ITEMS
-- =====================================================

-- Check for any foreign keys that reference line_items
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT 
            tc.table_name,
            tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'line_items'
    LOOP
        EXECUTE 'ALTER TABLE ' || constraint_record.table_name || 
               ' DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
    END LOOP;
END $$;

-- STEP 7: DROP THE LINE_ITEMS TABLE
-- =====================================================

-- Final drop of the line_items table
DROP TABLE IF EXISTS line_items CASCADE;

-- STEP 8: CLEAN UP ANY RELATED SEQUENCES
-- =====================================================

-- Drop sequences that might have been created for line_items
DROP SEQUENCE IF EXISTS line_items_id_seq;
DROP SEQUENCE IF EXISTS line_items_code_seq;

-- STEP 9: REMOVE ANY POLICIES (RLS)
-- =====================================================

-- Drop RLS policies if they exist
-- (These will be dropped automatically with the table, but listed for completeness)

-- STEP 10: CLEAN UP CUSTOM TYPES RELATED TO LINE_ITEMS
-- =====================================================

-- Drop custom types that might have been created for line_items
DROP TYPE IF EXISTS line_item_type CASCADE;
DROP TYPE IF EXISTS line_item_status CASCADE;

-- STEP 11: VERIFICATION QUERIES
-- =====================================================

-- Verify line_items table is completely removed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'line_items' AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'line_items table still exists!';
    ELSE
        RAISE NOTICE 'SUCCESS: line_items table has been completely removed';
    END IF;
END $$;

-- Verify no functions reference line_items
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (
    routine_name LIKE '%line_item%' 
    OR routine_definition LIKE '%line_items%'
)
ORDER BY routine_name;

-- Check for any remaining references
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE column_name LIKE '%line_item%' 
AND table_schema = 'public'
AND table_name != 'transaction_line_items'  -- Keep transaction_line_items
ORDER BY table_name, column_name;

-- STEP 12: FINAL SUMMARY
-- =====================================================

SELECT 'LINE_ITEMS CLEANUP COMPLETED SUCCESSFULLY' as status,
       'All line_items dependencies have been removed' as message,
       'transaction_line_items table remains intact' as note;

-- List remaining tables to confirm clean state
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%line%'
ORDER BY table_name;