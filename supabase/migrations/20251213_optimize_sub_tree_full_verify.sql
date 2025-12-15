-- 2025-12-13_optimize_sub_tree_full_verify.sql

select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'sub_tree'
  and indexname in ('idx_sub_tree_org_path', 'idx_sub_tree_org_parent')
order by indexname;

select schemaname, viewname, definition
from pg_views
where viewname in ('sub_tree_full', 'sub_tree_full_v2')
order by viewname;

select org_id, count(*) as rows
from public.sub_tree
group by org_id
order by rows desc
limit 10;

-- Replace :org_id with the top org_id returned above.
EXPLAIN (ANALYZE, BUFFERS)
select *
from public.sub_tree_full
where org_id = :org_id
order by path asc;
