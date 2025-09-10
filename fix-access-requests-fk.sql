-- Fix the foreign key relationship for access_requests table
-- Run this in your Supabase SQL Editor

-- First, let's check the current structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'access_requests' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Drop the existing foreign key constraint if it exists
ALTER TABLE public.access_requests 
DROP CONSTRAINT IF EXISTS access_requests_reviewed_by_fkey;

-- Add the proper foreign key constraint
ALTER TABLE public.access_requests 
ADD CONSTRAINT access_requests_reviewed_by_fkey 
FOREIGN KEY (reviewed_by) 
REFERENCES public.user_profiles(id);

-- Verify the constraint was added
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'access_requests';
