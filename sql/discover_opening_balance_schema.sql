-- Discover the actual schema of opening_balance_imports table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'opening_balance_imports'
ORDER BY ordinal_position;
