-- Verification queries for accounts RPCs
-- Replace placeholders before running in Supabase SQL editor

-- 1) Toggle a known account
select public.toggle_account_status('{{ORG_ID}}', '{{ACCOUNT_ID}}') as toggled;

-- 2) Update the same account
select public.account_update(
  '{{ORG_ID}}', '{{ACCOUNT_ID}}',
  '1000X', 'New Name EN', 'اسم جديد',
  'Asset', 2, 'active'
) as updated;

-- 3) Insert a child under a known parent
select public.account_insert_child(
  '{{ORG_ID}}', '{{PARENT_ACCOUNT_ID}}',
  '1001', 'Child Name', 'اسم فرعي',
  'Asset', 2, 'active'
) as inserted;

-- 4) Delete an account (use id from #3 if desired)
select public.account_delete('{{ORG_ID}}', '{{ACCOUNT_ID_TO_DELETE}}');

