-- Database Cleanup & Consolidation - Phase 1 Audit
-- Task 1.2: Create dependency map (foreign keys, triggers, RLS policies)

-- 1. List all foreign key relationships
SELECT 
  tc.table_name AS source_table,
  kcu.column_name AS source_column,
  ccu.table_name AS target_table,
  ccu.column_name AS target_column,
  rc.update_rule,
  rc.delete_rule,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 2. List all triggers on tables
SELECT 
  trigger_schema,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_orientation,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 3. List all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual AS policy_condition,
  with_check AS policy_with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. List all functions that reference tables
SELECT 
  routine_schema,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 5. Identify which tables are referenced by functions
SELECT DISTINCT
  t.table_name,
  COUNT(DISTINCT r.routine_name) AS function_count
FROM information_schema.tables t
LEFT JOIN information_schema.routines r ON r.routine_schema = 'public'
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
ORDER BY function_count DESC;

-- 6. List all indexes on tables
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 7. Identify tables with circular dependencies
WITH RECURSIVE fk_chain AS (
  -- Base case: all foreign keys
  SELECT 
    tc.table_name AS source_table,
    ccu.table_name AS target_table,
    ARRAY[tc.table_name, ccu.table_name] AS chain,
    1 AS depth
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
  
  UNION ALL
  
  -- Recursive case: follow the chain
  SELECT 
    fk_chain.source_table,
    tc.table_name,
    fk_chain.chain || tc.table_name,
    fk_chain.depth + 1
  FROM fk_chain
  JOIN information_schema.table_constraints AS tc
    ON fk_chain.target_table = tc.table_name
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND fk_chain.depth < 10
    AND NOT fk_chain.chain @> ARRAY[tc.table_name]
)
SELECT DISTINCT
  source_table,
  target_table,
  chain,
  depth
FROM fk_chain
WHERE source_table = target_table
  OR chain[1] = chain[array_length(chain, 1)]
ORDER BY source_table, depth;

-- 8. List all constraints on tables
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- 9. Identify tables with no constraints (potential candidates for consolidation)
SELECT 
  t.table_name,
  (SELECT COUNT(*) FROM information_schema.table_constraints tc 
   WHERE tc.table_name = t.table_name AND tc.table_schema = 'public') AS constraint_count,
  (SELECT COUNT(*) FROM information_schema.referential_constraints rc 
   WHERE rc.constraint_name IN (
     SELECT constraint_name FROM information_schema.table_constraints 
     WHERE table_name = t.table_name AND table_schema = 'public'
   )) AS fk_count
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
HAVING (SELECT COUNT(*) FROM information_schema.table_constraints tc 
        WHERE tc.table_name = t.table_name AND tc.table_schema = 'public') = 0
ORDER BY t.table_name;

-- 10. Create dependency summary for each table
SELECT 
  t.table_name,
  (SELECT COUNT(*) FROM information_schema.table_constraints tc 
   WHERE tc.table_name = t.table_name AND tc.constraint_type = 'PRIMARY KEY') AS has_pk,
  (SELECT COUNT(*) FROM information_schema.referential_constraints rc 
   WHERE rc.constraint_name IN (
     SELECT constraint_name FROM information_schema.table_constraints 
     WHERE table_name = t.table_name AND table_schema = 'public'
   )) AS outgoing_fk_count,
  (SELECT COUNT(*) FROM information_schema.referential_constraints rc 
   WHERE rc.unique_constraint_name IN (
     SELECT constraint_name FROM information_schema.table_constraints 
     WHERE table_name = t.table_name AND table_schema = 'public'
   )) AS incoming_fk_count,
  (SELECT COUNT(*) FROM information_schema.triggers 
   WHERE event_object_table = t.table_name AND trigger_schema = 'public') AS trigger_count,
  (SELECT COUNT(*) FROM pg_policies 
   WHERE tablename = t.table_name AND schemaname = 'public') AS rls_policy_count,
  (SELECT COUNT(*) FROM pg_indexes 
   WHERE tablename = t.table_name AND schemaname = 'public') AS index_count
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
