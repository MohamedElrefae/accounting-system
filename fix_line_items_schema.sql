-- FIX LINE ITEMS SCHEMA - COPY AND RUN THIS TO ENSURE PROPER TABLE STRUCTURE
-- This script will create missing columns and ensure the table works correctly

-- 1. First check what exists
SELECT 
    'Current table structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Add missing expenses_category_id column if it doesn't exist
DO $$ 
BEGIN
    -- Check if expenses_category_id column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transaction_line_items' 
            AND column_name = 'expenses_category_id'
            AND table_schema = 'public'
    ) THEN
        -- Add the column
        ALTER TABLE transaction_line_items 
        ADD COLUMN expenses_category_id UUID NULL;
        
        -- Add foreign key constraint if expenses_categories table exists
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'expenses_categories' AND table_schema = 'public'
        ) THEN
            ALTER TABLE transaction_line_items 
            ADD CONSTRAINT fk_transaction_line_items_expenses_category
            FOREIGN KEY (expenses_category_id) REFERENCES expenses_categories(id);
        END IF;
        
        RAISE NOTICE 'Added expenses_category_id column';
    ELSE
        RAISE NOTICE 'expenses_category_id column already exists';
    END IF;
END $$;

-- 3. Ensure total_amount is a generated column or has proper triggers
DO $$ 
BEGIN
    -- Check if total_amount column is generated
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transaction_line_items' 
            AND column_name = 'total_amount'
            AND table_schema = 'public'
            AND (column_default LIKE '%GENERATED%' OR column_default LIKE '%STORED%')
    ) THEN
        -- If it's not generated, let's make it computed via trigger
        -- First, create or replace the trigger function
        CREATE OR REPLACE FUNCTION calculate_line_item_total()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.total_amount := (NEW.quantity * (NEW.percentage / 100.0) * NEW.unit_price);
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;

        -- Drop existing trigger if it exists
        DROP TRIGGER IF EXISTS trigger_calculate_line_item_total ON transaction_line_items;
        
        -- Create the trigger
        CREATE TRIGGER trigger_calculate_line_item_total
            BEFORE INSERT OR UPDATE ON transaction_line_items
            FOR EACH ROW
            EXECUTE FUNCTION calculate_line_item_total();
            
        RAISE NOTICE 'Created total_amount calculation trigger';
    ELSE
        RAISE NOTICE 'total_amount is already a generated column';
    END IF;
END $$;

-- 4. Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_transaction_id 
ON transaction_line_items(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_line_items_line_number 
ON transaction_line_items(transaction_id, line_number);

-- 5. Test the table structure
INSERT INTO transaction_line_items (
    transaction_id, 
    line_number, 
    item_name_ar, 
    quantity, 
    percentage, 
    unit_price, 
    unit_of_measure
) VALUES (
    gen_random_uuid(), 
    1, 
    'Test Line Item', 
    2, 
    100, 
    25.50, 
    'piece'
) RETURNING 
    id,
    transaction_id,
    item_name_ar,
    quantity,
    percentage,
    unit_price,
    total_amount; -- Should show 2 * (100/100) * 25.50 = 51.00

-- 6. Clean up test data
DELETE FROM transaction_line_items WHERE item_name_ar = 'Test Line Item';

-- 7. Final verification
SELECT 
    'Schema fix completed successfully' as status,
    COUNT(*) as existing_line_items_count
FROM transaction_line_items;