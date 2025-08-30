-- Get current database schema and sample data for troubleshooting account deletion
-- Copy and paste this in Supabase SQL editor

-- 1) First, let's run the migration to fix the account_delete function
create or replace function public.account_delete(
  p_org_id uuid,
  p_account_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  _has_children boolean;
begin
  -- Prevent delete if the account has children
  select exists(
    select 1 from accounts a
    where a.org_id = p_org_id and a.parent_id = p_account_id
  ) into _has_children;

  if _has_children then
    raise exception 'Cannot delete account with children'
      using errcode = 'P0001'; -- raise_exception
  end if;

  begin
    delete from accounts
    where org_id = p_org_id
      and id = p_account_id;
  exception
    when foreign_key_violation then
      -- More helpful message when there are referencing rows (e.g., transactions)
      raise exception 'Cannot delete account because it is referenced by other records (e.g., transactions)'
        using errcode = '23503';
  end;
end;
$$;

-- 2) Get your org_id and some sample account IDs
select 
  'Your org_id is: ' || org_id::text as org_info,
  'Sample account IDs:' as account_info
from accounts 
limit 1;

-- 3) Show accounts with their hierarchy
select 
  id,
  code,
  name,
  name_ar,
  level,
  status,
  parent_id,
  org_id
from accounts 
where org_id = (select distinct org_id from accounts limit 1)
order by code
limit 20;

-- 4) Find accounts that have children (these will fail to delete)
select 
  p.id as parent_id,
  p.code as parent_code,
  p.name as parent_name,
  count(c.id) as child_count
from accounts p
inner join accounts c on c.parent_id = p.id and c.org_id = p.org_id
where p.org_id = (select distinct org_id from accounts limit 1)
group by p.id, p.code, p.name
order by p.code;

-- 5) Find accounts without children (safe to delete if no other references)
select 
  id,
  code,
  name,
  level,
  status
from accounts a
where org_id = (select distinct org_id from accounts limit 1)
  and not exists (
    select 1 from accounts c 
    where c.parent_id = a.id and c.org_id = a.org_id
  )
order by code
limit 10;

-- 6) Check what tables might reference accounts (find foreign keys)
select 
  tc.table_name,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu 
  on tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu 
  on ccu.constraint_name = tc.constraint_name
where tc.constraint_type = 'FOREIGN KEY'
  and ccu.table_name = 'accounts';
