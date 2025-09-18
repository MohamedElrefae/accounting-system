-- verify_approval_inbox_filter.sql
-- Purpose: Validate that list_approval_inbox returns only transactions with approval_status='submitted'

-- Replace {{REVIEWER_USER_ID}} with a real reviewer user id for targeted checks.

-- 1) Quick check on a specific entry number (should be empty if that tx is not submitted)
-- SELECT *
-- FROM public.list_approval_inbox('{{REVIEWER_USER_ID}}'::uuid)
-- WHERE entry_number = 'JE-202412-0012';

-- 2) Sanity: all returned items are submitted
WITH res AS (
  SELECT transaction_id
  FROM public.list_approval_inbox('{{REVIEWER_USER_ID}}'::uuid)
)
SELECT
  COUNT(*) AS total_items,
  SUM(CASE WHEN COALESCE(t.approval_status,'') <> 'submitted' THEN 1 ELSE 0 END) AS non_submitted_in_results,
  ARRAY_AGG(DISTINCT t.approval_status) AS statuses_seen
FROM res r
JOIN public.transactions t ON t.id = r.transaction_id;

-- 3) Optional: counts per step to ensure join stays intact
WITH res AS (
  SELECT r.*
  FROM public.list_approval_inbox('{{REVIEWER_USER_ID}}'::uuid) r
)
SELECT current_step_order, COUNT(*) AS items
FROM res
GROUP BY current_step_order
ORDER BY current_step_order;
