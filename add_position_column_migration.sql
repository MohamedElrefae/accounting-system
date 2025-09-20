-- =====================================================================
-- ADD POSITION COLUMN TO TRANSACTION_LINE_ITEMS TABLE
-- Copy and run this in your Supabase SQL Editor
-- =====================================================================

-- 1. Add the position column to the transaction_line_items table
ALTER TABLE transaction_line_items 
ADD COLUMN IF NOT EXISTS position INTEGER;

-- 2. Set default values for existing records based on line_number
UPDATE transaction_line_items 
SET position = line_number 
WHERE position IS NULL;

-- 3. Add index for better performance on position ordering
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_position 
ON transaction_line_items(transaction_id, position);

-- 4. Add check constraint to ensure position is positive
ALTER TABLE transaction_line_items 
ADD CONSTRAINT check_position_positive 
CHECK (position IS NULL OR position > 0);

-- 5. Update the trigger function to handle position if needed
CREATE OR REPLACE FUNCTION update_transaction_line_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- If position is not provided, use line_number as default
    IF NEW.position IS NULL AND NEW.line_number IS NOT NULL THEN
        NEW.position = NEW.line_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Ensure the trigger exists
DROP TRIGGER IF EXISTS trigger_update_transaction_line_items_updated_at ON transaction_line_items;
CREATE TRIGGER trigger_update_transaction_line_items_updated_at
    BEFORE UPDATE ON transaction_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_transaction_line_items_updated_at();