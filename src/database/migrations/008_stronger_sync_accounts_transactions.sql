-- 008_stronger_sync_accounts_transactions.sql
-- Enforce stronger integrity between transactions and accounts,
-- and snapshot account labels at post time.

begin;

-- 1) Add snapshot columns for account labels if not present
alter table public.transactions
  add column if not exists debit_account_code text,
  add column if not exists debit_account_name text,
  add column if not exists credit_account_code text,
  add column if not exists credit_account_name text;

-- 2) Validation function to ensure accounts are postable and active
create or replace function public.check_transaction_accounts()
returns trigger
language plpgsql
as $$
begin
  -- prevent same account on both sides
  if new.debit_account_id = new.credit_account_id then
    raise exception 'Debit and credit accounts must be different';
  end if;

  -- check debit account
  perform 1 from public.accounts a
   where a.id = new.debit_account_id
     and a.is_postable = true
     and coalesce(a.status, 'active') = 'active';
  if not found then
    raise exception 'Invalid debit account: must be postable and active';
  end if;

  -- check credit account
  perform 1 from public.accounts a
   where a.id = new.credit_account_id
     and a.is_postable = true
     and coalesce(a.status, 'active') = 'active';
  if not found then
    raise exception 'Invalid credit account: must be postable and active';
  end if;

  -- amount must be positive
  if coalesce(new.amount, 0) <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  return new;
end;
$$;

-- 3) Attach trigger to validate on insert/update for unposted rows
-- Use constraint trigger semantics via BEFORE triggers
create trigger tr_tx_check_accounts_ins
before insert on public.transactions
for each row execute function public.check_transaction_accounts();

create trigger tr_tx_check_accounts_upd
before update on public.transactions
for each row when (old.is_posted = false)
execute function public.check_transaction_accounts();

-- 4) Update post_transaction to snapshot account code/name at post time
create or replace function public.post_transaction(p_transaction_id uuid, p_posted_by uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not public.has_permission(auth.uid(), 'transactions.post') then
    raise exception 'Insufficient permissions to post transaction';
  end if;

  update public.transactions t
     set is_posted = true,
         posted_at = now(),
         posted_by = p_posted_by,
         updated_at = now(),
         debit_account_code = a1.code,
         debit_account_name = a1.name,
         credit_account_code = a2.code,
         credit_account_name = a2.name
    from public.accounts a1, public.accounts a2
   where t.id = p_transaction_id
     and t.debit_account_id = a1.id
     and t.credit_account_id = a2.id
     and t.is_posted = false;

  -- Audit
  insert into public.transaction_audit(transaction_id, action, actor_id, details)
  values (p_transaction_id, 'post', auth.uid(), jsonb_build_object('posted_by', p_posted_by));
end;
$$;

commit;

