-- ADD TOTAL AMOUNT CALCULATION TRIGGER
-- Copy and run this in your Supabase SQL Editor

-- 1. Create or replace the trigger function to calculate total_amount
CREATE OR REPLACE FUNCTION calculate_line_item_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total_amount = quantity * (percentage / 100.0) * unit_price
    NEW.total_amount := COALESCE(NEW.quantity, 0) * (COALESCE(NEW.percentage, 0) / 100.0) * COALESCE(NEW.unit_price, 0);
    
    -- Ensure updated_at is set for updates
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at := CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_calculate_line_item_total ON transaction_line_items;

-- 3. Create the trigger for INSERT and UPDATE
CREATE TRIGGER trigger_calculate_line_item_total
    BEFORE INSERT OR UPDATE ON transaction_line_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_line_item_total();

-- 4. Test the trigger with a sample insert
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
    gen_random_uuid(), 
    1, 
    'Test Trigger Item', 
    3, 
    100, 
    20.50, 
    'piece',
    gen_random_uuid()
) RETURNING 
    id,
    transaction_id,
    item_name_ar,
    quantity,
    percentage,
    unit_price,
    total_amount, -- Should show 3 * (100/100) * 20.50 = 61.50
    created_at,
    updated_at;

-- 5. Clean up test data
DELETE FROM transaction_line_items WHERE item_name_ar = 'Test Trigger Item';

ROLLBACK;

-- 6. Final verification message
SELECT 
    'Total amount calculation trigger added successfully!' as status,
    'The trigger will automatically calculate total_amount on INSERT/UPDATE' as info;

-- 7. Show trigger info
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'transaction_line_items'
    AND event_object_schema = 'public';