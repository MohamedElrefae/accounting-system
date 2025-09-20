-- =====================================================================
-- SCHEMA EXPORT FOR TESTING ENVIRONMENT
-- Run this script in your PRODUCTION database to export the schema
-- =====================================================================

-- This script will help you create a clean testing database
-- Copy the output and run it in your new testing Supabase project

-- =====================================================================
-- PART 1: Export Table Structures (Schema Only)
-- =====================================================================

-- Get all table creation statements
SELECT 
    'TABLE CREATION SCRIPT' as "Script Type",
    '-- Copy the following CREATE TABLE statements to your testing database' as "Instructions";

-- Export all table structures
SELECT 
    schemaname as "Schema",
    tablename as "Table Name",
    'CREATE TABLE ' || tablename || ' (' ||
    string_agg(
        column_name || ' ' || data_type ||
        case when character_maximum_length is not null 
             then '(' || character_maximum_length || ')' 
             else '' 
        end ||
        case when is_nullable = 'NO' then ' NOT NULL' else '' end,
        ', ' order by ordinal_position
    ) || ');' as "CREATE TABLE Statement"
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name NOT LIKE 'pg_%'
  AND table_name NOT LIKE '_prisma_%'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- =====================================================================  
-- PART 2: Export Indexes
-- =====================================================================

SELECT 
    'INDEX CREATION SCRIPT' as "Script Type",
    '-- Copy the following CREATE INDEX statements' as "Instructions";

-- Export all indexes
SELECT DISTINCT
    schemaname as "Schema",
    indexname as "Index Name", 
    indexdef as "CREATE INDEX Statement"
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname NOT LIKE 'pg_%'
ORDER BY indexname;

-- =====================================================================
-- PART 3: Export Foreign Key Constraints
-- =====================================================================

SELECT 
    'FOREIGN KEY CONSTRAINTS' as "Script Type",
    '-- Copy the following ALTER TABLE statements for foreign keys' as "Instructions";

SELECT 
    'ALTER TABLE ' || tc.table_name || 
    ' ADD CONSTRAINT ' || tc.constraint_name || 
    ' FOREIGN KEY (' || kcu.column_name || 
    ') REFERENCES ' || ccu.table_name || 
    ' (' || ccu.column_name || ');' as "Foreign Key Statement"
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- =====================================================================
-- PART 4: Export Functions and Stored Procedures
-- =====================================================================

SELECT 
    'FUNCTIONS AND PROCEDURES' as "Script Type",
    '-- Copy the following function definitions' as "Instructions";

SELECT 
    routine_name as "Function Name",
    routine_definition as "Function Definition"
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_type IN ('FUNCTION', 'PROCEDURE')
ORDER BY routine_name;

-- =====================================================================
-- PART 5: Export RLS Policies
-- =====================================================================

SELECT 
    'RLS POLICIES' as "Script Type",
    '-- Copy these commands to enable RLS and create policies' as "Instructions";

-- Show which tables have RLS enabled
SELECT 
    schemaname as "Schema",
    tablename as "Table Name",
    rowsecurity as "RLS Enabled",
    'ALTER TABLE ' || tablename || ' ENABLE ROW LEVEL SECURITY;' as "Enable RLS Command"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true
ORDER BY tablename;

-- =====================================================================
-- PART 6: Export Sample Data Structure (for key reference tables)
-- =====================================================================

SELECT 
    'SAMPLE DATA STRUCTURE' as "Script Type",
    '-- Key tables that need sample data for testing' as "Instructions";

-- Show structure of key reference tables that need sample data
SELECT 
    table_name as "Table Name",
    column_name as "Column",
    data_type as "Type",
    is_nullable as "Nullable"
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('roles', 'permissions', 'accounts', 'cost_centers')
ORDER BY table_name, ordinal_position;

-- =====================================================================
-- PART 7: Export Database Configuration
-- =====================================================================

SELECT 
    'DATABASE CONFIGURATION' as "Script Type",
    '-- Database settings and extensions' as "Instructions";

-- Show installed extensions
SELECT 
    extname as "Extension Name",
    extversion as "Version",
    'CREATE EXTENSION IF NOT EXISTS ' || extname || ';' as "Install Command"
FROM pg_extension
WHERE extname NOT IN ('plpgsql');

-- =====================================================================
-- PART 8: Summary Report
-- =====================================================================

SELECT 
    'SUMMARY REPORT' as "Report Type",
    'Database schema export completed' as "Status";

-- Table count
SELECT 
    'Total Tables' as "Metric",
    COUNT(*) as "Count"
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Function count  
SELECT 
    'Total Functions' as "Metric",
    COUNT(*) as "Count"
FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Index count
SELECT 
    'Total Indexes' as "Metric", 
    COUNT(*) as "Count"
FROM pg_indexes 
WHERE schemaname = 'public';

-- =====================================================================
-- USAGE INSTRUCTIONS:
-- =====================================================================

/*
INSTRUCTIONS FOR TESTING DATABASE SETUP:

1. RUN THIS SCRIPT in your PRODUCTION database
2. COPY the output results
3. CREATE NEW SUPABASE PROJECT for testing
4. RUN the copied CREATE TABLE statements in the new project
5. RUN the copied INDEX and CONSTRAINT statements
6. RUN the copied FUNCTION definitions
7. ENABLE RLS and create policies as shown
8. INSERT sample/seed data as needed

This will give you a clean, empty database with the same structure
as production for safe testing.
*/