-- Check the actual transaction_lines table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transaction_lines' 
ORDER BY ordinal_position;

-- Also check transaction_line_items to see which one exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items' 
ORDER BY ordinal_position;
