-- Discover the actual accounts table structure
-- Run this to see what columns exist in the accounts table

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'accounts'
ORDER BY ordinal_position;