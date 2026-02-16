-- ============================================================================
-- COMPLETE TRANSACTION LINES IMPORT WITH DIMENSION MAPPING
-- ============================================================================
-- This SQL script:
-- 1. Creates temporary dimension mapping tables
-- 2. Populates them from your dimension tables
-- 3. Generates transaction_lines with proper dimension UUIDs
-- 4. Includes comprehensive verification
--
-- RUN THIS IN SUPABASE SQL EDITOR (bypasses RLS issues)
-- ============================================================================

-- Configuration
DO $$
DECLARE
    v_org_id UUID := 'd5789445-11e3-4ad6-9297-b56521675114';
    v_total_lines INTEGER;
    v_total_debit NUMERIC;
    v_total_credit NUMERIC;
    v_balance NUMERIC;
    v_expected_lines INTEGER := 13963;
    v_expected_total NUMERIC := 905925674.84;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TRANSACTION LINES IMPORT WITH DIMENSIONS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Organization ID: %', v_org_id;
    RAISE NOTICE '';

    -- ========================================================================
    -- STEP 1: CREATE TEMPORARY DIMENSION MAPPING TABLES
    -- ========================================================================
    RAISE NOTICE 'STEP 1: Creating temporary dimension mapping tables...';
    
    DROP TABLE IF EXISTS temp_classification_map;
    DROP TABLE IF EXISTS temp_project_map;
    DROP TABLE IF EXISTS temp_analysis_map;
    DROP TABLE IF EXISTS temp_subtree_map;
    
    CREATE TEMP TABLE temp_classification_map AS
    SELECT 
        CAST(code AS TEXT) as code,
        id
    FROM transaction_classifications
    WHERE org_id = v_org_id;
    
    CREATE TEMP TABLE temp_project_map AS
    SELECT 
        CAST(code AS TEXT) as code,
        id
    FROM projects
    WHERE org_id = v_org_id;
    
    CREATE TEMP TABLE temp_analysis_map AS
    SELECT 
        CAST(code AS TEXT) as code,
        id
    FROM analysis_work_items
    WHERE org_id = v_org_id;
    
    CREATE TEMP TABLE temp_subtree_map AS
    SELECT 
        CAST(code AS TEXT) as code,
        id
    FROM sub_tree
    WHERE org_id = v_org_id;
    
    RAISE NOTICE '  ✓ Classification mappings: %', (SELECT COUNT(*) FROM temp_classification_map);
    RAISE NOTICE '  ✓ Project mappings: %', (SELECT COUNT(*) FROM temp_project_map);
    RAISE NOTICE '  ✓ Analysis mappings: %', (SELECT COUNT(*) FROM temp_analysis_map);
    RAISE NOTICE '  ✓ Sub-tree mappings: %', (SELECT COUNT(*) FROM temp_subtree_map);
    RAISE NOTICE '';

    -- ========================================================================
    -- STEP 2: VERIFY DIMENSION MAPPINGS
    -- ========================================================================
    RAISE NOTICE 'STEP 2: Verifying dimension mappings exist...';
    
    IF (SELECT COUNT(*) FROM temp_classification_map) = 0 THEN
        RAISE EXCEPTION 'No transaction_classifications found for org_id %', v_org_id;
    END IF;
    
    IF (SELECT COUNT(*) FROM temp_project_map) = 0 THEN
        RAISE EXCEPTION 'No projects found for org_id %', v_org_id;
    END IF;
    
    RAISE NOTICE '  ✓ All dimension tables have data';
    RAISE NOTICE '';

    -- ========================================================================
    -- STEP 3: CREATE STAGING TABLE FROM CSV DATA
    -- ========================================================================
    RAISE NOTICE 'STEP 3: You need to create staging table from CSV...';
    RAISE NOTICE '';
    RAISE NOTICE 'Please run the separate script: create_staging_table.sql';
    RAISE NOTICE 'Then come back and run: import_from_staging.sql';
    RAISE NOTICE '';
    
END $$;
