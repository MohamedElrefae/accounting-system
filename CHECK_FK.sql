-- Check foreign key constraints
SELECT 
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'transaction_line_items' 
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY kcu.column_name;

-- Test insert into transaction_lines (if needed for testing)
SELECT 
  id,
  transaction_id,
  line_number,
  description
FROM public.transaction_lines
LIMIT 3;

-- Test insert into transactions (if needed)
SELECT 
  id,
  entry_number
FROM public.transactions
LIMIT 3;
