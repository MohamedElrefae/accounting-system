-- 2025-12-13_optimize_sub_tree_full.sql

CREATE INDEX IF NOT EXISTS idx_sub_tree_org_path
ON public.sub_tree (org_id, path);

CREATE INDEX IF NOT EXISTS idx_sub_tree_org_parent
ON public.sub_tree (org_id, parent_id);

CREATE OR REPLACE VIEW public.sub_tree_full_v2 AS
SELECT
  st.id,
  st.org_id,
  st.parent_id,
  st.code,
  st.description,
  st.add_to_cost,
  st.is_active,
  st.linked_account_id,
  st.level,
  st.path,
  st.created_at,
  st.updated_at,
  st.created_by,
  st.updated_by,
  a.code AS linked_account_code,
  a.name AS linked_account_name,
  COALESCE(cc.child_count, 0::bigint) AS child_count,
  EXISTS (
    SELECT 1
    FROM public.transaction_lines tl
    WHERE tl.sub_tree_id = st.id
    LIMIT 1
  ) AS has_transactions
FROM public.sub_tree st
LEFT JOIN public.accounts a
  ON a.id = st.linked_account_id
LEFT JOIN LATERAL (
  SELECT count(*)::bigint AS child_count
  FROM public.sub_tree st2
  WHERE st2.org_id = st.org_id
    AND st2.parent_id = st.id
) cc ON true;

ANALYZE public.sub_tree;
ANALYZE public.transaction_lines;
