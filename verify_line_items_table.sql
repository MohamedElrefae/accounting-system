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

-- Test insert to ensure ID generation works (will be rolled back)
BEGIN;
INSERT INTO transaction_line_items (
    transaction_id, 
    line_number, 
    item_name_ar, 
    quantity, 
    percentage, 
    unit_price, 
    unit_of_measure,
    org_id
) VALUES (
    'test-transaction-id', 
    1, 
    'Test Item', 
    1, 
    100, 
    10.50, 
    'piece',
    'test-org-id'
);

-- Check if the insert worked and ID was generated
SELECT 
    id,
    transaction_id,
    line_number,
    item_name_ar,
    quantity,
    percentage,
    unit_price,
    total_amount
FROM transaction_line_items 
WHERE transaction_id = 'test-transaction-id';

ROLLBACK; -- Rollback the test insert

-- Verify the table is ready for production use
SELECT 
    'transaction_line_items table structure verified' as status,
    COUNT(*) as existing_records
FROM transaction_line_items;