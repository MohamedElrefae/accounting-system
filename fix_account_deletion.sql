-- Complete fix for account deletion with better error handling
-- Run this in Supabase SQL editor

-- Step 1: Update the account_delete function with better error handling
create or replace function public.account_delete(
  p_org_id uuid,
  p_account_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  _has_children boolean;
  _account_exists boolean;
begin
  -- Check if account exists
  select exists(
    select 1 from accounts
    where org_id = p_org_id and id = p_account_id
  ) into _account_exists;

  if not _account_exists then
    raise exception 'Account not found'
      using errcode = 'P0002';
  end if;

  -- Prevent delete if the account has children
  select exists(
    select 1 from accounts a
    where a.org_id = p_org_id and a.parent_id = p_account_id
  ) into _has_children;

  if _has_children then
    raise exception 'Cannot delete account with children'
      using errcode = 'P0001';
  end if;

  -- Try to delete, catch foreign key violations
  begin
    delete from accounts
    where org_id = p_org_id and id = p_account_id;
    
    if not found then
      raise exception 'Account could not be deleted'
        using errcode = 'P0003';
    end if;
  exception
    when foreign_key_violation then
      raise exception 'Cannot delete account because it is referenced by other records (e.g., transactions)'
        using errcode = '23503';
  end;
end;
$$;

-- Step 2: Test the function with your actual data
-- This will show your org_id and safe-to-delete accounts
do $$
declare
  _org_id uuid;
  _test_account_id uuid;
  _account_code text;
  _account_name text;
begin
  -- Get the org_id from your data
  select distinct org_id into _org_id from accounts limit 1;
  
  raise notice 'Your org_id is: %', _org_id;
  
  -- Find an account without children to test deletion
  select id, code, name into _test_account_id, _account_code, _account_name
  from accounts a
  where org_id = _org_id
    and level = 4  -- Leaf nodes are most likely safe
    and not exists (
      select 1 from accounts c 
      where c.parent_id = a.id and c.org_id = a.org_id
    )
  limit 1;
  
  if _test_account_id is not null then
    raise notice 'Safe to test delete: % - % - %', _account_code, _account_name, _test_account_id;
    
    -- Try to delete it (comment this out if you don't want to actually delete)
    -- perform account_delete(_org_id, _test_account_id);
    -- raise notice 'Successfully deleted account: %', _account_code;
  else
    raise notice 'No safe accounts found to test deletion';
  end if;
end;
$$;

-- Step 3: Show accounts that have children (will fail deletion)
select 
  'Accounts with children (cannot be deleted):' as info,
  p.code,
  p.name,
  p.name_ar,
  p.id,
  count(c.id) as child_count
from accounts p
inner join accounts c on c.parent_id = p.id and c.org_id = p.org_id
where p.org_id = (select distinct org_id from accounts limit 1)
group by p.id, p.code, p.name, p.name_ar
order by p.code;

-- Step 4: Show leaf accounts (no children, might be safe to delete)
select 
  'Leaf accounts (no children):' as info,
  a.code,
  a.name,
  a.name_ar,
  a.id,
  a.level,
  a.status
from accounts a
where org_id = (select distinct org_id from accounts limit 1)
  and not exists (
    select 1 from accounts c 
    where c.parent_id = a.id and c.org_id = a.org_id
  )
order by a.code;

-- Step 5: Check for foreign key references to accounts table
select 
  'Tables that reference accounts:' as info,
  tc.table_name as referencing_table,
  kcu.column_name as referencing_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu 
  on tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu 
  on ccu.constraint_name = tc.constraint_name
where tc.constraint_type = 'FOREIGN KEY'
  and ccu.table_name = 'accounts'
  and ccu.column_name = 'id'
order by tc.table_name;
