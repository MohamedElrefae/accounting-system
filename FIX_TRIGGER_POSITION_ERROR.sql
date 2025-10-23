-- =====================================================================
-- FIX TRIGGER ERROR - Remove position column references
-- Run this in your Supabase SQL Editor to fix the "position" field error
-- =====================================================================

-- 1. Drop the problematic trigger
DROP TRIGGER IF EXISTS trigger_update_transaction_line_items_updated_at ON transaction_line_items;

-- 2. Drop the old trigger function
DROP FUNCTION IF EXISTS update_transaction_line_items_updated_at();

-- 3. Create the CORRECT trigger function (without position field)
CREATE OR REPLACE FUNCTION update_transaction_line_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recreate the trigger with the correct function
CREATE TRIGGER trigger_update_transaction_line_items_updated_at
    BEFORE UPDATE ON transaction_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_transaction_line_items_updated_at();

-- 5. Verify the trigger is in place
-- You should see: trigger_update_transaction_line_items_updated_at | transaction_line_items | BEFORE | UPDATE
SELECT trigger_name, table_name, event_object_sql, event_manipulation
FROM information_schema.triggers 
WHERE table_name = 'transaction_line_items'
ORDER BY trigger_name;
