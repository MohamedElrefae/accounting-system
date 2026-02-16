-- SQL template (if using SQL instead of client SDK)
-- Parameter: :org_id

begin;

-- purge

delete from public.transaction_lines where org_id=:org_id;
delete from public.transactions where org_id=:org_id;
delete from public.accounts where org_id=:org_id;

-- staging tables (optional)
-- create temp table tmp_accounts (code text, parent_code text, name text, name_ar text, category public.account_category,
--   allow_transactions bool, is_postable bool, is_standard bool, legacy_code text, legacy_name text, level_hint int);
-- copy tmp_accounts from 'KIRO_SUPABASE_accounts_stage.csv' csv header;

-- insert accounts
-- insert into public.accounts (org_id, code, name, name_ar, category, allow_transactions, is_postable, is_standard, legacy_code, legacy_name)
-- select :org_id, code, name, name_ar, category, allow_transactions, is_postable, is_standard, nullif(legacy_code,''), nullif(legacy_name,'')
-- from tmp_accounts;

-- set parents
-- update public.accounts c
-- set parent_id = p.id
-- from tmp_accounts t
-- join public.accounts p on p.org_id=:org_id and p.code=t.parent_code
-- where c.org_id=:org_id and c.code=t.code and t.parent_code<>'';

-- create temp table tmp_tx (tx_key text, entry_number text, entry_date date, description text, notes text,
--   description_ar text, notes_ar text, approval_status text, status text, approval_method text, is_posted bool,
--   total_debits numeric(18,4), total_credits numeric(18,4), lines_total_count int);
-- copy tmp_tx from 'KIRO_SUPABASE_transactions_stage.csv' csv header;

-- insert transactions
-- insert into public.transactions (org_id, entry_number, entry_date, description, notes, description_ar, notes_ar, approval_status, status, approval_method, is_posted)
-- select :org_id, entry_number, entry_date, description, nullif(notes,''), description_ar, nullif(notes_ar,''), approval_status, status, approval_method, is_posted
-- from tmp_tx;

-- create temp table tmp_lines (tx_key text, line_no int, account_code text, debit_amount numeric(15,4), credit_amount numeric(15,4), description text,
--   source_old_code text, source_old_name text);
-- copy tmp_lines from 'KIRO_SUPABASE_transaction_lines_stage.csv' csv header;

-- insert lines
-- insert into public.transaction_lines (org_id, transaction_id, line_no, account_id, debit_amount, credit_amount, description)
-- select :org_id, tx.id, l.line_no, a.id, l.debit_amount, l.credit_amount, nullif(l.description,'')
-- from tmp_lines l
-- join tmp_tx t on t.tx_key=l.tx_key
-- join public.transactions tx on tx.org_id=:org_id and tx.entry_number=t.entry_number and tx.entry_date=t.entry_date
-- join public.accounts a on a.org_id=:org_id and a.code=l.account_code;

commit;
