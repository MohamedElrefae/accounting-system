-- schema_discovery.sql
-- Purpose: quick helpers to introspect the DB around approvals inbox and transactions status

-- DB flavor and session context
SELECT version() AS db_version;
SELECT current_database() AS db, current_schema() AS schema_name, session_user AS session_user;

-- Locate list_approval_inbox function(s)
SELECT
  n.nspname                          AS schema_name,
  p.proname                          AS function_name,
  pg_get_function_identity_arguments(p.oid) AS function_args,
  pg_get_function_result(p.oid)      AS returns,
  pg_get_functiondef(p.oid)          AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname ILIKE 'list_approval_inbox'
ORDER BY schema_name, function_name;

-- Tables/columns with approval_status
SELECT table_schema, table_name, column_name, data_type
FROM information_schema.columns
WHERE column_name ILIKE 'approval_status'
ORDER BY table_schema, table_name;

-- Transactions tables that have approval_status
SELECT table_schema, table_name
FROM information_schema.columns
WHERE column_name = 'approval_status' AND table_name ILIKE '%transact%'
ORDER BY table_schema, table_name;

-- Foreign keys referencing transactions
WITH tx AS (
  SELECT table_schema, table_name
  FROM information_schema.columns
  WHERE column_name = 'approval_status' AND table_name ILIKE '%transact%'
  LIMIT 1
)
SELECT
  conname,
  pg_catalog.pg_get_constraintdef(c.oid, true) AS condef,
  n.nspname AS schema_name,
  rel.relname AS table_name
FROM pg_constraint c
JOIN pg_class rel ON rel.oid = c.conrelid
JOIN pg_namespace n ON n.oid = rel.relnamespace
WHERE c.contype = 'f'
  AND pg_catalog.pg_get_constraintdef(c.oid, true) ILIKE (SELECT '%' || table_schema || '.' || table_name || '%' FROM tx);

-- Indexes on approval_status
WITH tx AS (
  SELECT table_schema, table_name
  FROM information_schema.columns
  WHERE column_name = 'approval_status' AND table_name ILIKE '%transact%'
)
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE (schemaname, tablename) IN (SELECT table_schema, table_name FROM tx)
  AND indexdef ILIKE '%(approval_status%';
