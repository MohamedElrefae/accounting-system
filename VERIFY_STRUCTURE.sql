-- Verify table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items' 
ORDER BY ordinal_position;

-- Verify foreign keys
SELECT 
  constraint_name,
  constraint_type,
  column_name,
  referenced_table_name,
  referenced_column_name
FROM information_schema.key_column_usage
WHERE table_name = 'transaction_line_items'
ORDER BY constraint_name;

-- Check for any existing data
SELECT COUNT(*) as total_records FROM public.transaction_line_items;

-- Get transaction_lines count
SELECT COUNT(*) as transaction_lines_count FROM public.transaction_lines;

-- Get transactions count
SELECT COUNT(*) as transactions_count FROM public.transactions;
