# PHASE 0, TASK 0.2 - VERIFY ORG MEMBERSHIPS

**Status:** ⏳ READY TO START  
**Time:** ~5 minutes  
**Date:** January 23, 2026  

---

## 🎯 OBJECTIVE

Verify that the `org_memberships` table has correct data and all users have proper organization assignments.

---

## 📋 WHAT TO CHECK

### 1. Verify org_memberships Table Exists
```sql
SELECT COUNT(*) as membership_count FROM org_memberships;
```

**Expected:** > 0 (should have at least some memberships)

---

### 2. Check All Users Have Org Assignments
```sql
SELECT 
  u.id,
  u.email,
  COUNT(om.org_id) as org_count
FROM auth.users u
LEFT JOIN org_memberships om ON u.id = om.user_id
GROUP BY u.id, u.email
ORDER BY org_count ASC;
```

**Expected:** All users should have at least 1 org_count

**Red Flag:** Users with org_count = 0 (orphaned users)

---

### 3. Check for Orphaned Memberships
```sql
SELECT 
  om.user_id,
  om.org_id,
  om.role
FROM org_memberships om
LEFT JOIN auth.users u ON om.user_id = u.id
WHERE u.id IS NULL;
```

**Expected:** 0 rows (no orphaned memberships)

**Red Flag:** Any rows = orphaned memberships pointing to deleted users

---

### 4. Check Organization Coverage
```sql
SELECT 
  o.id,
  o.name,
  COUNT(om.user_id) as member_count
FROM organizations o
LEFT JOIN org_memberships om ON o.id = om.org_id
GROUP BY o.id, o.name
ORDER BY member_count ASC;
```

**Expected:** All organizations should have at least 1 member

**Red Flag:** Organizations with member_count = 0 (empty orgs)

---

### 5. Check Role Distribution
```sql
SELECT 
  role,
  COUNT(*) as count
FROM org_memberships
GROUP BY role
ORDER BY count DESC;
```

**Expected:** Mix of roles (admin, accountant, viewer, etc.)

---

## ✅ VERIFICATION CHECKLIST

- [ ] org_memberships table exists
- [ ] All users have at least 1 org assignment
- [ ] No orphaned memberships (memberships with deleted users)
- [ ] All organizations have at least 1 member
- [ ] Role distribution looks reasonable

---

## 🔧 IF ISSUES FOUND

### Issue: Users with org_count = 0
**Solution:** Assign users to organizations
```sql
-- Example: Assign user to organization
INSERT INTO org_memberships (user_id, org_id, role)
VALUES ('user-id', 'org-id', 'accountant');
```

### Issue: Orphaned Memberships
**Solution:** Delete memberships for deleted users
```sql
DELETE FROM org_memberships
WHERE user_id NOT IN (SELECT id FROM auth.users);
```

### Issue: Empty Organizations
**Solution:** Either delete empty orgs or assign members
```sql
-- Delete empty organization
DELETE FROM organizations
WHERE id NOT IN (SELECT DISTINCT org_id FROM org_memberships);
```

---

## 📊 EXPECTED DATA STRUCTURE

```
org_memberships table should have:
- user_id (UUID) - references auth.users
- org_id (UUID) - references organizations
- role (VARCHAR) - admin, accountant, viewer, etc.
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## 🎯 SUCCESS CRITERIA

- [x] org_memberships table exists
- [ ] All users have org assignments
- [ ] No orphaned memberships
- [ ] All organizations have members
- [ ] Role distribution is reasonable

---

## 📝 NEXT STEPS

After verification:

1. ✅ TASK-0.1: Deploy RLS Policies - **COMPLETE**
2. ✅ TASK-0.2: Verify Org Memberships - **IN PROGRESS**
3. → TASK-0.3: Document Current State
4. → TASK-0.4: Test Quick Wins

---

## 📁 RELATED FILES

- `PHASE_0_TASK_0_1_DEPLOYMENT_SUCCESS.md` - Previous task results
- `AI_AGENT_EXECUTION_PLAN_ENTERPRISE_AUTH.md` - Full plan

---

**Time:** ~5 minutes  
**Difficulty:** Easy  
**Risk:** Very Low  

