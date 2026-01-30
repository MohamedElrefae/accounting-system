# PHASE 0 DEPLOYMENT CHECKLIST

**Task:** Deploy RLS Policy Fixes  
**File:** `sql/quick_wins_fix_rls_policies_WORKING.sql`  
**Estimated Time:** 10 minutes  
**Date:** January 23, 2026  

---

## PRE-DEPLOYMENT

- [ ] Read `PHASE_0_DEPLOYMENT_READY.md`
- [ ] Read `PHASE_0_QUICK_REFERENCE.md`
- [ ] Have Supabase dashboard open
- [ ] Have SQL file open: `sql/quick_wins_fix_rls_policies_WORKING.sql`

---

## DEPLOYMENT STEPS

### Step 1: Copy SQL (1 minute)
- [ ] Open: `sql/quick_wins_fix_rls_policies_WORKING.sql`
- [ ] Select all content (Ctrl+A)
- [ ] Copy (Ctrl+C)
- [ ] Verify clipboard has content

### Step 2: Paste into Supabase (1 minute)
- [ ] Go to: https://supabase.com/dashboard
- [ ] Select your project
- [ ] Click: **SQL Editor** (left sidebar)
- [ ] Click: **New Query** (top right)
- [ ] Paste SQL (Ctrl+V)
- [ ] Verify SQL is pasted correctly

### Step 3: Execute (1 minute)
- [ ] Click: **Run** button (top right)
- [ ] Wait for execution to complete
- [ ] Verify: No errors in output
- [ ] Verify: Query executed successfully

---

## POST-DEPLOYMENT VERIFICATION (3 minutes)

### Verify Policies Created
- [ ] Run verification query in Supabase:
```sql
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('organizations', 'projects', 'transactions', 'transaction_line_items', 'accounts')
ORDER BY tablename, policyname;
```
- [ ] Verify: 10 rows returned (2 per table × 5 tables)
- [ ] Verify: All policy names are correct

### Expected Policies
- [ ] organizations: users_see_their_orgs
- [ ] organizations: super_admins_see_all_orgs
- [ ] projects: users_see_org_projects
- [ ] projects: super_admins_see_all_projects
- [ ] transactions: users_see_org_transactions
- [ ] transactions: super_admins_see_all_transactions
- [ ] transaction_line_items: users_see_org_transaction_line_items
- [ ] transaction_line_items: super_admins_see_all_line_items
- [ ] accounts: users_see_org_accounts
- [ ] accounts: super_admins_see_all_accounts

---

## TESTING (5 minutes)

### Test 1: Accountant User
- [ ] Log out of Supabase
- [ ] Log in as accountant user
- [ ] Run query:
```sql
SELECT COUNT(*) as visible_orgs FROM organizations;
```
- [ ] Verify: Result is 1-2 (only their orgs)
- [ ] Verify: NOT 10+ (all orgs)
- [ ] If still showing all orgs:
  - [ ] Clear browser cache (Ctrl+Shift+Delete)
  - [ ] Log out and log back in
  - [ ] Try again

### Test 2: Super Admin User
- [ ] Log out of Supabase
- [ ] Log in as super admin user
- [ ] Run query:
```sql
SELECT COUNT(*) as visible_orgs FROM organizations;
```
- [ ] Verify: Result is 10+ (all orgs)
- [ ] Verify: Super admin can see all organizations

### Test 3: Cross-Org Access Blocked
- [ ] Log in as accountant user
- [ ] Try to access organization they don't belong to
- [ ] Verify: Access denied or no data returned
- [ ] Verify: Cannot see other org's transactions

---

## TROUBLESHOOTING

### Issue: Syntax Error
- [ ] Verify you're using `sql/quick_wins_fix_rls_policies_WORKING.sql`
- [ ] Check file hasn't been modified
- [ ] Try copying and pasting again

### Issue: Policy Already Exists
- [ ] This is OK - DROP POLICY IF EXISTS handles this
- [ ] Policies will be replaced with new ones

### Issue: Table Does Not Exist
- [ ] This is OK - policy will be created when table exists
- [ ] Verify table exists in Supabase

### Issue: Accountant Still Sees All Orgs
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Log out completely
- [ ] Close browser
- [ ] Log back in
- [ ] Try again

### Issue: Permission Denied Error
- [ ] Verify you're logged in as super admin
- [ ] Verify you have SQL Editor access
- [ ] Try again

---

## SUCCESS CRITERIA

- [ ] SQL deploys without errors
- [ ] 10 policies created successfully
- [ ] All policy names match expected list
- [ ] Accountant sees only their orgs (1-2)
- [ ] Super admin sees all orgs (10+)
- [ ] Cross-org access is blocked
- [ ] No errors in browser console

---

## SIGN-OFF

- [ ] All checks passed
- [ ] All tests passed
- [ ] Ready to proceed to TASK-0.2

---

## NEXT STEPS

After successful deployment:

1. ✅ **TASK-0.1:** Deploy RLS Policy Fixes - **COMPLETE**
2. → **TASK-0.2:** Verify Org Memberships
3. → **TASK-0.3:** Document Current State
4. → **TASK-0.4:** Test Quick Wins
5. → **PHASE 1:** Deploy Enhanced Auth RPC Functions

---

## SUPPORT

If you encounter issues:
1. Check the troubleshooting section above
2. Review `PHASE_0_TASK_0_1_FIX_REPORT.md` for details
3. Review `PHASE_0_DEPLOYMENT_READY.md` for guidance
4. Check `AI_AGENT_EXECUTION_PLAN_ENTERPRISE_AUTH.md` for context

---

**File:** `sql/quick_wins_fix_rls_policies_WORKING.sql`  
**Status:** ✅ READY TO DEPLOY  
**Confidence:** HIGH  
**Risk Level:** VERY LOW  

