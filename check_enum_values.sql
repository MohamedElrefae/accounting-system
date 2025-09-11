-- Check what values the normal_side enum accepts
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'normal_side'
ORDER BY e.enumsortorder;

-- Also check current normal_balance values
SELECT normal_balance, COUNT(*) as count
FROM public.accounts 
GROUP BY normal_balance 
ORDER BY normal_balance;
