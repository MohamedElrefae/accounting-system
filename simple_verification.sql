-- SIMPLE VERIFICATION - NO INSERT TEST NEEDED
-- Copy and paste this block to verify table structure only

-- 1. TABLE STRUCTURE VERIFICATION
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

-- 2. CONSTRAINTS VERIFICATION  
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE cl.relname = 'transaction_line_items' 
    AND n.nspname = 'public';

-- 3. TRIGGERS VERIFICATION
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'transaction_line_items'
    AND event_object_schema = 'public';

-- 4. CHECK EXISTING LINE ITEMS
SELECT 
    COUNT(*) as total_line_items,
    COUNT(DISTINCT transaction_id) as transactions_with_line_items
FROM transaction_line_items;

-- 5. SAMPLE DATA (if any exists)
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
LIMIT 3;