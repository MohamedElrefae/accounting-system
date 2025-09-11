-- Check the generated column definition for normal_balance
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    is_generated,
    generation_expression
FROM information_schema.columns 
WHERE table_name = 'accounts' 
    AND table_schema = 'public' 
    AND column_name = 'normal_balance';

-- Also check the full table definition
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    is_generated,
    generation_expression
FROM information_schema.columns 
WHERE table_name = 'accounts' 
    AND table_schema = 'public'
ORDER BY ordinal_position;
