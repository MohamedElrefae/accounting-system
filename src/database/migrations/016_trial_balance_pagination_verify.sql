-- 016_trial_balance_pagination_verify.sql
-- Verify the paginated Trial Balance (current) RPC works and pages correctly by account code.
-- Replace placeholders before running:
--   {{ORG_ID}}  -> your organization UUID

-- 1) First page (limit 5)
select *
from public.get_trial_balance_current_tx_enhanced_page(
  '{{ORG_ID}}'::uuid,
  'posted',       -- or 'all'
  null,           -- p_project_id
  5,              -- p_limit
  null            -- p_after_code
);

-- 2) Next page using last code from the first page
select *
from public.get_trial_balance_current_tx_enhanced_page(
  '{{ORG_ID}}'::uuid,
  'posted',
  null,
  5,
  (
    select max(code)
    from public.get_trial_balance_current_tx_enhanced_page(
      '{{ORG_ID}}'::uuid,
      'posted',
      null,
      5,
      null
    )
  )
);

-- 3) Optional: Filter by a specific project
-- select *
-- from public.get_trial_balance_current_tx_enhanced_page(
--   '{{ORG_ID}}'::uuid,
--   'posted',
--   '{{PROJECT_ID}}'::uuid, -- replace or set to null
--   10,
--   null
-- );

