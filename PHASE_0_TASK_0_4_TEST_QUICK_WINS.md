# PHASE 0, TASK 0.4 - TEST QUICK WINS

**Status:** ⏳ READY TO START  
**Date:** January 23, 2026  
**Time:** ~10 minutes  

---

## 🎯 OBJECTIVE

Test that the RLS policies work correctly with real users to verify the security fix is effective.

---

## 🧪 TEST 1: Accountant User (Should See Only Their Orgs)

### Setup
- **User:** tecofficepc@gmail.com (1 organization)
- **Expected:** See only their 1 organization, not all 4

### Test Steps

#### Step 1: Login as Accountant
1. Log out of Supabase
2. Log in as tecofficepc@gmail.com
3. Go to SQL Editor

#### Step 2: Query Organizations
```sql
SELECT id, name FROM organizations;
```

**Expected Result:**
```
Only 1 organization visible (their organization)
```

**Failure Indicator:**
```
4 organizations visible (all organizations - SECURITY ISSUE)
```

#### Step 3: Query Projects
```sql
SELECT id, name, org_id FROM projects;
```

**Expected Result:**
```
Only projects from their organization
```

#### Step 4: Query Transactions
```sql
SELECT id, org_id FROM transactions;
```

**Expected Result:**
```
Only transactions from their organization
```

---

## 🧪 TEST 2: Super Admin User (Should See All Orgs)

### Setup
- **User:** m.elrefeay81@gmail.com (4 organizations, is_super_admin = true)
- **Expected:** See all 4 organizations

### Test Steps

#### Step 1: Login as Super Admin
1. Log out of Supabase
2. Log in as m.elrefeay81@gmail.com
3. Go to SQL Editor

#### Step 2: Query Organizations
```sql
SELECT id, name FROM organizations;
```

**Expected Result:**
```
All 4 organizations visible
```

**Failure Indicator:**
```
Less than 4 organizations visible
```

#### Step 3: Query Projects
```sql
SELECT id, name, org_id FROM projects;
```

**Expected Result:**
```
All projects from all organizations
```

#### Step 4: Query Transactions
```sql
SELECT id, org_id FROM transactions;
```

**Expected Result:**
```
All transactions from all organizations
```

---

## 🧪 TEST 3: Cross-Org Access Blocked

### Setup
- **User:** tecofficepc@gmail.com (1 organization)
- **Test:** Try to access organization they don't belong to

### Test Steps

#### Step 1: Login as Accountant
1. Log in as tecofficepc@gmail.com
2. Go to SQL Editor

#### Step 2: Try to Access Other Organization
```sql
-- Try to access an organization they don't belong to
SELECT * FROM organizations 
WHERE id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'; -- المؤسسة الرئيسية
```

**Expected Result:**
```
No rows returned (access denied)
```

**Failure Indicator:**
```
Organization data returned (SECURITY ISSUE)
```

#### Step 3: Try to Access Other Org's Transactions
```sql
-- Try to access transactions from organization they don't belong to
SELECT * FROM transactions 
WHERE org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441';
```

**Expected Result:**
```
No rows returned (access denied)
```

---

## 📊 TEST RESULTS TEMPLATE

### Test 1: Accountant User
- [ ] Can see only their organization(s)
- [ ] Cannot see other organizations
- [ ] Can see only their projects
- [ ] Can see only their transactions
- **Status:** ✅ PASS / ❌ FAIL

### Test 2: Super Admin User
- [ ] Can see all organizations
- [ ] Can see all projects
- [ ] Can see all transactions
- **Status:** ✅ PASS / ❌ FAIL

### Test 3: Cross-Org Access Blocked
- [ ] Cannot access other org's data
- [ ] Cannot access other org's transactions
- **Status:** ✅ PASS / ❌ FAIL

---

## ✅ SUCCESS CRITERIA

All tests must pass:
- [x] Accountant sees only their organizations
- [x] Accountant cannot see other organizations
- [x] Super admin sees all organizations
- [x] Cross-org access is blocked
- [x] No errors in queries

---

## 🔧 TROUBLESHOOTING

### Issue: Accountant Still Sees All Organizations
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Log out completely
3. Close browser
4. Log back in
5. Try again

### Issue: Super Admin Cannot See All Organizations
**Solution:**
1. Verify is_super_admin = true in user_profiles
```sql
SELECT id, email, is_super_admin FROM user_profiles 
WHERE email = 'm.elrefeay81@gmail.com';
```
2. If false, update it:
```sql
UPDATE user_profiles 
SET is_super_admin = true 
WHERE email = 'm.elrefeay81@gmail.com';
```

### Issue: Query Returns Error
**Solution:**
1. Check RLS policies are deployed
```sql
SELECT COUNT(*) FROM pg_policies 
WHERE tablename IN ('organizations', 'projects', 'transactions', 'transaction_line_items', 'accounts');
```
2. Should return 10 policies
3. If not, re-deploy RLS policies

---

## 📝 NOTES

- Tests should be run in Supabase SQL Editor
- Each test should be run with a fresh login
- Clear cache between tests if needed
- Document any failures with screenshots

---

## 📊 PHASE 0 PROGRESS

| Task | Status | Time |
|------|--------|------|
| TASK-0.1: Deploy RLS Policies | ✅ COMPLETE | 10 min |
| TASK-0.2: Verify Org Memberships | ✅ COMPLETE | 10 min |
| TASK-0.3: Document Current State | ✅ COMPLETE | 5 min |
| TASK-0.4: Test Quick Wins | ⏳ IN PROGRESS | 10 min |

**Progress:** 75% (3 of 4 tasks complete)

---

## 🚀 AFTER TASK-0.4

Once all tests pass:
1. ✅ PHASE 0 COMPLETE
2. → PHASE 1: Deploy Enhanced Auth RPC Functions (5 tasks, ~45 minutes)

---

**Status:** ⏳ READY TO TEST  
**Confidence:** HIGH  
**Risk:** VERY LOW  

