-- ================================================================
-- DIAGNOSTIC QUERIES: Find remaining transaction_id references
-- ================================================================

-- A1. Check for policies on transaction_line_items that reference transaction_id
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    polcmd, 
    qual, 
    with_check
FROM pg_policies
WHERE schemaname='public' 
  AND tablename='transaction_line_items'
  AND (qual::text ilike '%transaction_id%' 
       OR with_check::text ilike '%transaction_id%');

-- A2. Check for triggers and functions on transaction_line_items mentioning transaction_id
SELECT 
    t.tgname,
    p.proname,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'public.transaction_line_items'::regclass
  AND pg_get_functiondef(p.oid) ilike '%transaction_id%';

-- A3. Get function bodies that reference transaction_line_items AND transaction_id
SELECT 
    p.proname,
    p.prosrc
FROM pg_proc p
WHERE prosrc ilike '%transaction_line_items%'
  AND prosrc ilike '%transaction_id%'
  AND schemaname = 'public';

-- B1. Check transaction_line_items table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transaction_line_items'
ORDER BY ordinal_position;

-- B2. Check foreign key constraints
SELECT 
    constraint_name,
    column_name,
    referenced_table_name,
    referenced_column_name
FROM information_schema.key_column_usage
WHERE table_schema = 'public'
  AND table_name = 'transaction_line_items'
  AND referenced_table_name IS NOT NULL;

-- B3. Check indexes on transaction_line_items
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'transaction_line_items'
ORDER BY indexname;

-- C1. List all triggers on transaction_line_items
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name,
    CASE t.tgtype & 1
        WHEN 1 THEN 'ROW'
        ELSE 'STATEMENT'
    END as trigger_level,
    CASE t.tgtype & 66
        WHEN 2 THEN 'BEFORE'
        WHEN 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END as trigger_time,
    CASE 
        WHEN (t.tgtype & 4) != 0 THEN 'INSERT'
        WHEN (t.tgtype & 8) != 0 THEN 'UPDATE'
        WHEN (t.tgtype & 16) != 0 THEN 'DELETE'
        WHEN (t.tgtype & 32) != 0 THEN 'TRUNCATE'
    END as trigger_event
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'transaction_line_items'
ORDER BY t.tgname;

-- D1. Check transactions table has required columns for summary
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transactions'
  AND column_name IN ('line_items_total', 'line_items_count', 'has_line_items')
ORDER BY ordinal_position;

-- E1. Summary of potential issues
SELECT 
    'transaction_line_items' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN transaction_id IS NULL THEN 1 END) as rows_without_transaction_id
FROM public.transaction_line_items;
