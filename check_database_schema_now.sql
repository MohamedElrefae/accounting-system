-- Database Schema Check - Run this to find correct table/column names
-- This will help us create the correct cost analysis setup

-- 1. Find all tables that might be related to expenses/categories
SELECT 'EXPENSE/CATEGORY TABLES FOUND:' as info, '================================' as details
UNION ALL
SELECT table_name as info, 
       'Found in database' as details
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name ILIKE '%expense%' 
       OR table_name ILIKE '%categor%' 
       OR table_name ILIKE '%sub_tree%'
       OR table_name ILIKE '%tree%')
ORDER BY info;

-- 2. Find all tables related to analysis/work items  
SELECT '' as info, '' as details
UNION ALL
SELECT 'ANALYSIS/WORK ITEM TABLES FOUND:' as info, '================================' as details
UNION ALL
SELECT table_name as info, 
       'Found in database' as details
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name ILIKE '%analysis%' 
       OR table_name ILIKE '%work%'
       OR table_name ILIKE '%item%')
ORDER BY info;

-- 3. Check what columns exist in expenses_categories (if table exists)
SELECT '' as info, '' as details
UNION ALL
SELECT 'EXPENSES_CATEGORIES COLUMNS:' as info, '================================' as details
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses_categories')
         THEN column_name 
         ELSE 'Table expenses_categories does not exist'
    END as info,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses_categories')
         THEN data_type
         ELSE ''
    END as details
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'expenses_categories'
ORDER BY ordinal_position;

-- 4. Check what columns exist in analysis_work_items (if table exists)
SELECT '' as info, '' as details  
UNION ALL
SELECT 'ANALYSIS_WORK_ITEMS COLUMNS:' as info, '================================' as details
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analysis_work_items')
         THEN column_name 
         ELSE 'Table analysis_work_items does not exist'
    END as info,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analysis_work_items')
         THEN data_type
         ELSE ''
    END as details
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'analysis_work_items'
ORDER BY ordinal_position;

-- 5. Check transactions table structure
SELECT '' as info, '' as details
UNION ALL
SELECT 'TRANSACTIONS TABLE COLUMNS:' as info, '================================' as details
UNION ALL
SELECT column_name as info, data_type as details
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'transactions'
ORDER BY ordinal_position;

-- 6. Check if transaction_line_items already exists
SELECT '' as info, '' as details
UNION ALL
SELECT 'TRANSACTION_LINE_ITEMS STATUS:' as info, '================================' as details
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transaction_line_items')
         THEN 'Table EXISTS - showing columns:'
         ELSE 'Table DOES NOT EXIST'
    END as info,
    '' as details
UNION ALL
SELECT 
    COALESCE(column_name, '') as info,
    COALESCE(data_type, '') as details
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'transaction_line_items'
ORDER BY ordinal_position;

-- 7. Show me all tables to understand the full structure
SELECT '' as info, '' as details
UNION ALL
SELECT 'ALL TABLES IN DATABASE:' as info, '================================' as details
UNION ALL
SELECT table_name as info, 
       'public schema' as details
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;