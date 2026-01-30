# PHASE 0 - NEXT STEPS

**Current Status:** TASK-0.1 Complete ✅  
**Next Task:** TASK-0.2 Ready to Start ⏳  

---

## 🎯 WHAT'S NEXT

### TASK-0.2: Verify Org Memberships (5 minutes)

Run these 5 verification queries in Supabase SQL Editor:

---

## 📋 VERIFICATION QUERIES

### Query 1: Check org_memberships Table Exists
```sql
SELECT COUNT(*) as membership_count FROM org_memberships;
```
**Expected:** > 0

---

### Query 2: Check All Users Have Org Assignments
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
**Expected:** All users should have org_count > 0

---

### Query 3: Check for Orphaned Memberships
```sql
SELECT 
  om.user_id,
  om.org_id,
  om.role
FROM org_memberships om
LEFT JOIN auth.users u ON om.user_id = u.id
WHERE u.id IS NULL;
```
**Expected:** 0 rows

---

### Query 4: Check Organization Coverage
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
**Expected:** All orgs should have member_count > 0

---

### Query 5: Check Role Distribution
```sql
SELECT 
  role,
  COUNT(*) as count
FROM org_memberships
GROUP BY role
ORDER BY count DESC;
```
**Expected:** Mix of roles

---

## ✅ VERIFICATION CHECKLIST

- [ ] Query 1: org_memberships exists
- [ ] Query 2: All users have org assignments
- [ ] Query 3: No orphaned memberships
- [ ] Query 4: All orgs have members
- [ ] Query 5: Role distribution looks good

---

## 🎯 IF ALL CHECKS PASS

Proceed to TASK-0.3: Document Current State

---

## 🔧 IF ISSUES FOUND

### Issue: Users with org_count = 0
Assign them to an organization:
```sql
INSERT INTO org_memberships (user_id, org_id, role)
VALUES ('user-id', 'org-id', 'accountant');
```

### Issue: Orphaned Memberships
Delete them:
```sql
DELETE FROM org_memberships
WHERE user_id NOT IN (SELECT id FROM auth.users);
```

### Issue: Empty Organizations
Delete them:
```sql
DELETE FROM organizations
WHERE id NOT IN (SELECT DISTINCT org_id FROM org_memberships);
```

---

## 📝 AFTER TASK-0.2

1. ✅ TASK-0.1: Deploy RLS Policies - COMPLETE
2. ✅ TASK-0.2: Verify Org Memberships - (in progress)
3. → TASK-0.3: Document Current State
4. → TASK-0.4: Test Quick Wins

---

## ⏱️ TIME

- TASK-0.2: ~5 minutes
- TASK-0.3: ~5 minutes
- TASK-0.4: ~10 minutes
- **Total remaining:** ~20 minutes

---

## 📁 REFERENCE

- `PHASE_0_TASK_0_2_VERIFY_ORG_MEMBERSHIPS.md` - Full task guide
- `PHASE_0_EXECUTION_SUMMARY.md` - Phase 0 overview
- `ENTERPRISE_AUTH_CURRENT_STATUS.md` - Current status

---

**Ready to proceed?** Run the 5 verification queries above.

