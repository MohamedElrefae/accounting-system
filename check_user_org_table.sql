-- Find tables that might contain user-organization relationships
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name ILIKE '%user%' OR table_name ILIKE '%org%' OR table_name ILIKE '%member%')
ORDER BY table_name;

-- Also check the transactions table structure to see how org_id is used
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
