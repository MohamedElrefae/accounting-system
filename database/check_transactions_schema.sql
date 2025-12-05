-- Check transactions table schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'transactions'
ORDER BY ordinal_position;

-- Check if there's a transaction_lines table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'transaction_lines'
ORDER BY ordinal_position;

-- Check gl2_journal_lines table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'gl2_journal_lines'
ORDER BY ordinal_position;
