-- 009_general_ledger.sql
-- Introduce a general ledger and trial balance view, and hook posting to ledger entries.

begin;

-- 1) Ledger table (append-only)
create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  entry_date date not null,
  account_id uuid not null references public.accounts(id),
  description text,
  reference_number text,
  debit numeric not null default 0,
  credit numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_ledger_entries_account on public.ledger_entries(account_id);
create index if not exists idx_ledger_entries_tx on public.ledger_entries(transaction_id);
create index if not exists idx_ledger_entries_date on public.ledger_entries(entry_date);

-- Ensure idempotency of posting per transaction
create unique index if not exists ux_ledger_tx_once on public.ledger_entries(transaction_id);
-- Note: This enforces a single pair insert per transaction via a partial strategy in function

-- 2) Trial balance view (sums posted ledger)
create or replace view public.v_trial_balance as
select
  a.id as account_id,
  a.code,
  a.name,
  sum(le.debit) as total_debit,
  sum(le.credit) as total_credit,
  sum(le.debit - le.credit) as balance
from public.accounts a
left join public.ledger_entries le on le.account_id = a.id
group by a.id, a.code, a.name;

-- 3) Update post_transaction to insert double-entry rows
create or replace function public.post_transaction(p_transaction_id uuid, p_posted_by uuid)
returns void
language plpgsql
security definer
as $$
declare
  t record;
begin
  if not public.has_permission(auth.uid(), 'transactions.post') then
    raise exception 'Insufficient permissions to post transaction';
  end if;

  -- Fetch transaction (must be unposted)
  select * into t from public.transactions where id = p_transaction_id and is_posted = false;
  if not found then
    return; -- already posted or not found
  end if;

  -- Snapshot labels and mark posted
  update public.transactions tx
     set is_posted = true,
         posted_at = now(),
         posted_by = p_posted_by,
         updated_at = now(),
         debit_account_code = a1.code,
         debit_account_name = a1.name,
         credit_account_code = a2.code,
         credit_account_name = a2.name
    from public.accounts a1, public.accounts a2
   where tx.id = p_transaction_id
     and tx.debit_account_id = a1.id
     and tx.credit_account_id = a2.id;

  -- Insert ledger rows if not already inserted for this transaction
  if not exists (select 1 from public.ledger_entries where transaction_id = p_transaction_id) then
    -- Debit line
    insert into public.ledger_entries(transaction_id, entry_date, account_id, description, reference_number, debit, credit)
    values (p_transaction_id, t.entry_date, t.debit_account_id, t.description, t.reference_number, t.amount, 0);

    -- Credit line
    insert into public.ledger_entries(transaction_id, entry_date, account_id, description, reference_number, debit, credit)
    values (p_transaction_id, t.entry_date, t.credit_account_id, t.description, t.reference_number, 0, t.amount);
  end if;

  -- Audit
  insert into public.transaction_audit(transaction_id, action, actor_id, details)
  values (p_transaction_id, 'post', auth.uid(), jsonb_build_object('posted_by', p_posted_by));
end;
$$;

commit;

