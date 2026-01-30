# PHASE 0 - QUICK REFERENCE CARD

## 🎯 MISSION
Deploy 10 RLS policies to fix security vulnerability where accountants can see all organizations

## 📋 DEPLOY THIS FILE
```
sql/quick_wins_fix_rls_policies_WORKING.sql
```

## 🚀 3-STEP DEPLOYMENT

### 1️⃣ COPY
Open `sql/quick_wins_fix_rls_policies_WORKING.sql` and copy all content

### 2️⃣ PASTE
Go to Supabase → SQL Editor → New Query → Paste

### 3️⃣ RUN
Click "Run" button

---

## ✅ VERIFY SUCCESS

Run this query in Supabase:
```sql
SELECT COUNT(*) FROM pg_policies 
WHERE tablename IN ('organizations', 'projects', 'transactions', 'transaction_line_items', 'accounts');
```

**Expected:** 10 rows

---

## 🧪 TEST AFTER DEPLOY

### Accountant User
```sql
SELECT COUNT(*) FROM organizations;
-- BEFORE: 10+ (all)
-- AFTER: 1-2 (only theirs)
```

### Super Admin User
```sql
SELECT COUNT(*) FROM organizations;
-- EXPECTED: 10+ (all)
```

---

## 📊 POLICIES DEPLOYED

| Table | Policy 1 | Policy 2 |
|-------|----------|----------|
| organizations | users_see_their_orgs | super_admins_see_all_orgs |
| projects | users_see_org_projects | super_admins_see_all_projects |
| transactions | users_see_org_transactions | super_admins_see_all_transactions |
| transaction_line_items | users_see_org_transaction_line_items | super_admins_see_all_line_items |
| accounts | users_see_org_accounts | super_admins_see_all_accounts |

---

## ⏱️ TIME
~10 minutes total

## 🔐 SECURITY FIX
✅ Blocks cross-org data access

## 📝 NEXT
TASK-0.2: Verify Org Memberships

