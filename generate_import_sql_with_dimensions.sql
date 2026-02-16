-- ============================================================================
-- GENERATE TRANSACTION LINES IMPORT SQL WITH DIMENSION MAPPING
-- ============================================================================
-- This script queries your CSV data and dimension tables to generate
-- INSERT statements with proper dimension UUIDs
--
-- PREREQUISITES:
-- 1. CSV data loaded into temp_csv_lines table (see instructions below)
-- 2. Dimension tables populated (transaction_classifications, projects, etc.)
--
-- RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================================

-- First, you need to load your CSV into a temporary table
-- Copy transaction_lines.csv content and run this:

/*
CREATE TEMP TABLE temp_csv_lines (
    transaction_id TEXT,
    account_id UUID,
    classification_code TEXT,
    project_code TEXT,
    analysis_code TEXT,
    subtree_code TEXT,
    debit_amount NUMERIC,
    credit_amount NUMERIC,
    description TEXT,
    org_id UUID
);

-- Then use Supabase's CSV import feature or COPY command to load data
-- In Supabase SQL Editor, you can paste CSV data like this:

COPY temp_csv_lines FROM STDIN WITH (FORMAT CSV, HEADER true);
-- Paste your CSV data here
\.
*/

-- ============================================================================
-- GENERATE INSERT STATEMENTS WITH DIMENSION MAPPING
-- ============================================================================

DO $$
DECLARE
    v_org_id UUID := 'd5789445-11e3-4ad6-9297-b56521675114';
    v_sql TEXT;
    v_count INTEGER := 0;
    v_chunk_size INTEGER := 700;
    v_file_num INTEGER := 1;
    rec RECORD;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'GENERATING IMPORT SQL WITH DIMENSIONS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Start building SQL
    v_sql := format(E'-- Transaction Lines Import - Part %s\n', v_file_num);
    v_sql := v_sql || format(E'-- Organization ID: %s\n', v_org_id);
    v_sql := v_sql || E'-- WITH PROPER DIMENSION UUID MAPPING\n\n';
    
    v_sql := v_sql || E'INSERT INTO transaction_lines (\n';
    v_sql := v_sql || E'    transaction_id,\n';
    v_sql := v_sql || E'    line_no,\n';
    v_sql := v_sql || E'    account_id,\n';
    v_sql := v_sql || E'    classification_id,\n';
    v_sql := v_sql || E'    project_id,\n';
    v_sql := v_sql || E'    analysis_work_item_id,\n';
    v_sql := v_sql || E'    sub_tree_id,\n';
    v_sql := v_sql || E'    debit_amount,\n';
    v_sql := v_sql || E'    credit_amount,\n';
    v_sql := v_sql || E'    description,\n';
    v_sql := v_sql || E'    org_id\n';
    v_sql := v_sql || E')\n';
    v_sql := v_sql || E'SELECT \n';
    v_sql := v_sql || E'    t.id as transaction_id,\n';
    v_sql := v_sql || E'    COALESCE((SELECT MAX(line_no) FROM transaction_lines WHERE transaction_id = t.id), 0) + ROW_NUMBER() OVER (PARTITION BY t.id ORDER BY csv.transaction_id) as line_no,\n';
    v_sql := v_sql || E'    csv.account_id,\n';
    v_sql := v_sql || E'    class_map.id as classification_id,\n';
    v_sql := v_sql || E'    proj_map.id as project_id,\n';
    v_sql := v_sql || E'    anal_map.id as analysis_work_item_id,\n';
    v_sql := v_sql || E'    sub_map.id as sub_tree_id,\n';
    v_sql := v_sql || E'    csv.debit_amount,\n';
    v_sql := v_sql || E'    csv.credit_amount,\n';
    v_sql := v_sql || E'    csv.description,\n';
    v_sql := v_sql || E'    csv.org_id\n';
    v_sql := v_sql || E'FROM temp_csv_lines csv\n';
    v_sql := v_sql || E'JOIN transactions t ON t.reference_number = LTRIM(SPLIT_PART(csv.transaction_id, ''-'', 1), ''TXN0'') AND t.org_id = csv.org_id\n';
    v_sql := v_sql || E'LEFT JOIN transaction_classifications class_map ON class_map.code::text = SPLIT_PART(csv.classification_code, ''.'', 1) AND class_map.org_id = csv.org_id\n';
    v_sql := v_sql || E'LEFT JOIN projects proj_map ON proj_map.code::text = SPLIT_PART(csv.project_code, ''.'', 1) AND proj_map.org_id = csv.org_id\n';
    v_sql := v_sql || E'LEFT JOIN analysis_work_items anal_map ON anal_map.code::text = SPLIT_PART(csv.analysis_code, ''.'', 1) AND anal_map.org_id = csv.org_id\n';
    v_sql := v_sql || E'LEFT JOIN sub_tree sub_map ON sub_map.code::text = SPLIT_PART(csv.subtree_code, ''.'', 1) AND sub_map.org_id = csv.org_id\n';
    v_sql := v_sql || E'WHERE csv.account_id IS NOT NULL\n';
    v_sql := v_sql || E'  AND csv.account_id != ''00000000-0000-0000-0000-000000000000''::uuid\n';
    v_sql := v_sql || E'  AND NOT (csv.debit_amount = 0 AND csv.credit_amount = 0);\n';
    
    RAISE NOTICE '%', v_sql;
    RAISE NOTICE '';
    RAISE NOTICE 'Copy the SQL above and save it as import_transaction_lines.sql';
    RAISE NOTICE 'Then run it in Supabase SQL Editor';
    
END $$;
