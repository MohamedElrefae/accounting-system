-- 017_trial_balance_asof_pagination_verify.sql
-- Verify the paginated As-Of Trial Balance RPC works and pages correctly by account code.
-- Replace placeholders before running:
--   {{ORG_ID}}    -> your organization UUID
--   {{AS_OF_ISO}} -> ISO date (YYYY-MM-DD) for as-of

-- 1) First page (limit 5) for the as-of date
select *
from public.get_account_balances_as_of_tx_enhanced_page(
  '{{ORG_ID}}'::uuid,
  '{{AS_OF_ISO}}'::timestamptz,
  'posted',       -- or 'all'
  null,           -- p_project_id
  5,              -- p_limit
  null            -- p_after_code
);

-- 2) Next page using last code from the first page
select *
from public.get_account_balances_as_of_tx_enhanced_page(
  '{{ORG_ID}}'::uuid,
  '{{AS_OF_ISO}}'::timestamptz,
  'posted',
  null,
  5,
  (
    select max(code)
    from public.get_account_balances_as_of_tx_enhanced_page(
      '{{ORG_ID}}'::uuid,
      '{{AS_OF_ISO}}'::timestamptz,
      'posted',
      null,
      5,
      null
    )
  )
);

-- 3) Optional: Filter by a specific project
-- select *
-- from public.get_account_balances_as_of_tx_enhanced_page(
--   '{{ORG_ID}}'::uuid,
--   '{{AS_OF_ISO}}'::timestamptz,
--   'posted',
--   '{{PROJECT_ID}}'::uuid, -- replace or set to null
--   10,
--   null
-- );

