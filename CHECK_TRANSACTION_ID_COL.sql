SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items' 
  AND column_name = 'transaction_id';
