-- LINE ITEMS SCHEMA DISCOVERY - COPY AND RUN THIS FIRST
-- This will show us the actual column names in the transaction_line_items table

-- 1. Get ALL columns in transaction_line_items table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if table exists at all
SELECT 
    table_name,
    table_type,
    table_schema
FROM information_schema.tables 
WHERE table_name LIKE '%transaction%line%' 
    OR table_name LIKE '%line%item%'
    OR table_name LIKE '%cost%'
ORDER BY table_name;

-- 3. Find any column that might be related to expenses/categories
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND (
        column_name ILIKE '%expense%' 
        OR column_name ILIKE '%category%' 
        OR column_name ILIKE '%sub_tree%'
        OR column_name ILIKE '%tree%'
    )
ORDER BY table_name, column_name;

-- 4. Quick test - check for the specific columns we're looking for
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items' 
    AND table_schema = 'public'
    AND column_name IN ('sub_tree_id', 'expenses_category_id', 'expense_category_id', 'category_id')
ORDER BY column_name;

-- 5. Try to query the table with just basic columns to see if it exists
SELECT COUNT(*) as table_row_count
FROM transaction_line_items;

-- 6. Show the table definition if it exists
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'transaction_line_items'
ORDER BY ordinal_position;