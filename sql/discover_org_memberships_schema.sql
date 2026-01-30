-- Discover org_memberships table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'org_memberships'
ORDER BY ordinal_position;

-- Check for foreign key constraints on organizations table
SELECT 
  constraint_name,
  table_name,
  column_name,
  foreign_table_name,
  foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'organizations' 
  AND tc.constraint_type = 'FOREIGN KEY';

-- Check what's referencing the empty organizations
SELECT 
  'accounts' as table_name,
  COUNT(*) as count
FROM accounts
WHERE org_id IN (
  '0fbe51e8-71ae-48ba-a70c-139045a20843',
  '6ec6a563-7ac2-4b76-ac27-41c9d54b4921',
  '61897e4b-a9d1-4efb-ab8f-9bedb457ef34'
);

