-- 015_gl_account_summary_verify.sql

-- 1) Smoke test
select *
from public.get_gl_account_summary(current_date, current_date, null, null, true, 50, 0)
limit 50;

-- 2) Check splits are non-negative
with s as (
  select * from public.get_gl_account_summary(current_date - 7, current_date, null, null, true, null, null)
)
select
  sum(case when opening_debit  < 0 then 1 else 0 end) as bad_opening_debit,
  sum(case when opening_credit < 0 then 1 else 0 end) as bad_opening_credit,
  sum(case when closing_debit  < 0 then 1 else 0 end) as bad_closing_debit,
  sum(case when closing_credit < 0 then 1 else 0 end) as bad_closing_credit
from s;
