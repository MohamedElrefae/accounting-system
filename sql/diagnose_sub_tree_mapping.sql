-- Diagnostic queries to understand the sub_tree and accounts structure

-- 1. Check accounts table structure and sample data
SELECT 
  'accounts' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT org_id) as org_count
FROM public.accounts;

-- 2. Check sub_tree table structure and current state
SELECT 
  'sub_tree' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT org_id) as org_count,
  COUNT(CASE WHEN linked_account_id IS NOT NULL THEN 1 END) as with_linked_account,
  COUNT(CASE WHEN linked_account_id IS NULL THEN 1 END) as without_linked_account
FROM public.sub_tree;

-- 3. Sample accounts data with codes
SELECT id, code, name, org_id
FROM public.accounts
LIMIT 10;

-- 4. Sample sub_tree data
SELECT id, code, description, linked_account_id, org_id
FROM public.sub_tree
LIMIT 10;

-- 5. Check if there's a relationship between sub_tree.code and accounts.code
SELECT 
  st.id,
  st.code as sub_tree_code,
  st.description,
  a.id as account_id,
  a.code as account_code,
  a.name as account_name
FROM public.sub_tree st
LEFT JOIN public.accounts a ON st.code = a.code AND st.org_id = a.org_id
LIMIT 20;

-- 6. Check for any existing linked_account_id values
SELECT DISTINCT linked_account_id, COUNT(*) as count
FROM public.sub_tree
WHERE linked_account_id IS NOT NULL
GROUP BY linked_account_id
LIMIT 20;
