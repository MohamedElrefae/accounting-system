-- Check the accounts table schema to understand column types
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'accounts' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check some sample data from accounts table
SELECT 
    id, 
    code, 
    name, 
    category, 
    pg_typeof(category) as category_type,
    is_postable, 
    status
FROM public.accounts 
LIMIT 10;
