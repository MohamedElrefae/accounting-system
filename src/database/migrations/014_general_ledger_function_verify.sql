-- 014_general_ledger_function_verify.sql
-- Verification queries for the GL function

-- 1) Smoke test for today's date range
select *
from public.get_general_ledger_report(
  null,
  current_date,
  current_date,
  null,
  null,
  true,
  false
)
order by account_code, entry_date, entry_number
limit 50;

-- 2) Per-account opening/running/closing consistency (replace ACCOUNT_ID as needed)
with gl as (
  select *
  from public.get_general_ledger_report(null, current_date - 7, current_date, null, null, true, false)
)
select
  account_code,
  min(entry_date) as period_start,
  max(entry_date) as period_end,
  min(opening_balance) as opening_balance,
  (array_agg(running_balance order by entry_date, entry_number, transaction_id))[
    array_length(array_agg(running_balance order by entry_date, entry_number, transaction_id),1)
  ] as last_running_balance,
  min(closing_balance) as closing_balance_constant
from gl
group by account_code;

-- 3) Non-negative split sanity
with gl as (
  select *
  from public.get_general_ledger_report(null, current_date - 7, current_date, null, null, true, false)
)
select
  sum(case when opening_debit  < 0 then 1 else 0 end) as bad_opening_debit,
  sum(case when opening_credit < 0 then 1 else 0 end) as bad_opening_credit,
  sum(case when running_debit  < 0 then 1 else 0 end) as bad_running_debit,
  sum(case when running_credit < 0 then 1 else 0 end) as bad_running_credit,
  sum(case when closing_debit  < 0 then 1 else 0 end) as bad_closing_debit,
  sum(case when closing_credit < 0 then 1 else 0 end) as bad_closing_credit
from gl;
