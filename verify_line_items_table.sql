-- SQL to verify transaction_line_items table structure and constraints
-- Run this in your Supabase SQL editor to verify the table is properly set up

-- Check if the table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    is_identity,
    identity_generation
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check constraints on the table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE cl.relname = 'transaction_line_items' 
    AND n.nspname = 'public';

-- Check if there's a trigger for total_amount calculation
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'transaction_line_items'
    AND event_object_schema = 'public';

-- Test insert to ensure ID generation and total_amount trigger work (rolled back)
BEGIN;

-- Insert a test record linked to an existing transaction_line (required by NOT NULL FK)
INSERT INTO transaction_line_items (
    transaction_line_id,
    line_number,
    item_name_ar,
    quantity,
    percentage,
    unit_price,
    unit_of_measure,
    org_id
)
SELECT 
    tl.id,
    COALESCE((SELECT MAX(line_number) + 1 FROM transaction_line_items tli WHERE tli.transaction_line_id = tl.id), 1) AS next_line_number,
    'Test Item',
    1,
    100,
    10.50,
    'piece',
    tl.org_id
FROM public.transaction_lines tl
ORDER BY tl.created_at DESC
LIMIT 1;

-- Check if the insert worked and ID was generated
SELECT 
    id,
    transaction_line_id,
    item_name_ar,
    quantity,
    percentage,
    unit_price,
    total_amount
FROM transaction_line_items 
WHERE item_name_ar = 'Test Item'
ORDER BY created_at DESC
LIMIT 1;

ROLLBACK; -- Rollback the test insert

-- Verify the table is ready for production use
SELECT 
    'transaction_line_items table structure verified' as status,
    COUNT(*) as existing_records
FROM transaction_line_items;
