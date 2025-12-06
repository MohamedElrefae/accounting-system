-- Discover actual transactions table schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Discover transaction_lines schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transaction_lines' 
ORDER BY ordinal_position;

-- Discover transaction_line_items schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items' 
ORDER BY ordinal_position;
