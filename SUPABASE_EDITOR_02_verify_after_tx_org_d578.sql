-- 02) Verification SQL AFTER loading transactions + lines
-- org_id = d5789445-11e3-4ad6-9297-b56521675114

-- A) Totals from lines (must balance)
select
  count(*) as lines_rows,
  sum(debit_amount) as total_debit,
  sum(credit_amount) as total_credit,
  (sum(debit_amount)-sum(credit_amount)) as diff
from public.transaction_lines
where org_id='d5789445-11e3-4ad6-9297-b56521675114'::uuid;

-- Expected after full load:
-- lines_rows = 14161
-- total_debit = total_credit = 905925674.8393676

-- B) Any unbalanced transactions?
select
  tx.entry_number,
  tx.entry_date,
  sum(l.debit_amount) as deb,
  sum(l.credit_amount) as cred,
  (sum(l.debit_amount)-sum(l.credit_amount)) as diff
from public.transactions tx
join public.transaction_lines l on l.transaction_id=tx.id
where tx.org_id='d5789445-11e3-4ad6-9297-b56521675114'::uuid
group by tx.entry_number, tx.entry_date
having (sum(l.debit_amount)-sum(l.credit_amount)) <> 0
order by abs(sum(l.debit_amount)-sum(l.credit_amount)) desc;

-- C) Trial balance by account
select
  a.code,
  a.name,
  a.name_ar,
  sum(l.debit_amount) as debit,
  sum(l.credit_amount) as credit,
  sum(l.debit_amount)-sum(l.credit_amount) as net
from public.transaction_lines l
join public.accounts a on a.id=l.account_id
where l.org_id='d5789445-11e3-4ad6-9297-b56521675114'::uuid
group by a.code, a.name, a.name_ar
order by a.code;
