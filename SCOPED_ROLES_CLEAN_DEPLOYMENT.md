# Scoped Roles Migration - Clean Deployment (No Data Migration)

**Status:** ✅ READY TO DEPLOY  
**Date:** January 26, 2026  
**Approach:** Create structure only, add data later

---

## 🎯 What This Does

Creates the **scoped roles system** without migrating any data. You can add data later when ready.

**Perfect for testing** because:
- ✅ Clean structure
- ✅ No data conflicts
- ✅ Can add data manually
- ✅ Can test with sample data first

---

## 🚀 Deploy in 4 Steps

### Step 1: Backup Database
```bash
pg_dump your_database > backup_$(date +%Y%m%d).sql
```

### Step 2: Run Migrations (IN ORDER)
```bash
# Phase 1: Create tables
psql -f supabase/migrations/20260126_create_scoped_roles_tables.sql

# Phase 2: Create empty tables (NO DATA MIGRATION)
psql -f supabase/migrations/20260126_migrate_to_scoped_roles_data_CLEAN.sql

# Phase 3: Update RLS
psql -f supabase/migrations/20260126_update_rls_for_scoped_roles.sql

# Phase 4: Update RPC
psql -f supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql
```

### Step 3: Verify Tables Created
```sql
SELECT * FROM system_roles;
SELECT * FROM org_roles;
SELECT * FROM project_roles;
-- Should all be empty
```

### Step 4: Add Data Later
When ready, run:
```bash
psql -f sql/add_scoped_roles_data_later.sql
```

---

## 📋 Files to Use

### ✅ USE THESE (Clean Approach)
- `supabase/migrations/20260126_create_scoped_roles_tables.sql`
- `supabase/migrations/20260126_migrate_to_scoped_roles_data_CLEAN.sql` ← **NEW - NO DATA**
- `supabase/migrations/20260126_update_rls_for_scoped_roles.sql`
- `supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql`
- `sql/add_scoped_roles_data_later.sql` ← **Run this later to add data**

### ❌ DO NOT USE (Old Versions)
- `supabase/migrations/20260126_migrate_to_scoped_roles_data.sql` ❌
- `supabase/migrations/20260126_migrate_to_scoped_roles_data_FIXED.sql` ❌

---

## 📊 What Gets Created

### Empty Tables (Ready for Data)
```sql
system_roles (empty)
├─ user_id UUID
├─ role TEXT
└─ created_at TIMESTAMPTZ

org_roles (empty)
├─ user_id UUID
├─ org_id UUID
├─ role TEXT
├─ can_access_all_projects BOOLEAN
└─ created_at TIMESTAMPTZ

project_roles (empty)
├─ user_id UUID
├─ project_id UUID
├─ role TEXT
└─ created_at TIMESTAMPTZ
```

### RLS Policies (Active)
- ✅ All policies created
- ✅ Security enforced
- ✅ Ready for data

### Helper Functions (Available)
- ✅ `has_org_role()`
- ✅ `has_project_role()`
- ✅ `is_super_admin()`
- ✅ `get_user_org_roles()`
- ✅ `get_user_project_roles()`

---

## 🎯 Add Data Later

When you're ready to add data, run:

```bash
psql -f sql/add_scoped_roles_data_later.sql
```

This will:
1. Add super admins from `user_profiles.is_super_admin`
2. Add org roles from `org_memberships`
3. Add project roles from `project_memberships`
4. Handle org-level access to all projects

---

## 🧪 Test with Sample Data

### Option 1: Add Test Data Manually
```sql
-- Add a super admin
INSERT INTO system_roles (user_id, role, created_by)
VALUES ('user-id-here', 'super_admin', 'user-id-here');

-- Add an org role
INSERT INTO org_roles (user_id, org_id, role, can_access_all_projects, created_by)
VALUES ('user-id-here', 'org-id-here', 'org_admin', true, 'user-id-here');

-- Add a project role
INSERT INTO project_roles (user_id, project_id, role, created_by)
VALUES ('user-id-here', 'project-id-here', 'project_manager', 'user-id-here');
```

### Option 2: Use Application UI
- Create roles through your application
- Test permissions
- Verify access control

### Option 3: Run Data Migration Script
```bash
psql -f sql/add_scoped_roles_data_later.sql
```

---

## ✅ Verification Checklist

### After Phase 1-4 Migrations
- [ ] Phase 1 migration runs without errors
- [ ] Phase 2 (CLEAN) migration runs without errors
- [ ] Phase 3 migration runs without errors
- [ ] Phase 4 migration runs without errors
- [ ] `system_roles` table exists and is empty
- [ ] `org_roles` table exists and is empty
- [ ] `project_roles` table exists and is empty
- [ ] RLS policies are active
- [ ] Helper functions are available

### After Adding Data
- [ ] Data migration script runs without errors
- [ ] Record counts are correct
- [ ] Sample user has correct roles
- [ ] RLS policies work correctly
- [ ] Access control is enforced

---

## 🚀 Full Deployment Timeline

### Phase 1: Create Tables
```bash
psql -f supabase/migrations/20260126_create_scoped_roles_tables.sql
```
✅ Creates structure, RLS, functions

### Phase 2: Create Empty Tables
```bash
psql -f supabase/migrations/20260126_migrate_to_scoped_roles_data_CLEAN.sql
```
✅ No data migration, just verification

### Phase 3: Update RLS
```bash
psql -f supabase/migrations/20260126_update_rls_for_scoped_roles.sql
```
✅ Updates all RLS policies

### Phase 4: Update RPC
```bash
psql -f supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql
```
✅ Updates auth functions

### Phase 5: Test with Sample Data
- Add test data manually or via UI
- Test permissions
- Verify access control

### Phase 6: Add Real Data (When Ready)
```bash
psql -f sql/add_scoped_roles_data_later.sql
```
✅ Migrates data from old tables

### Phase 7: Update Frontend
- Update `src/hooks/useOptimizedAuth.ts`
- See `SCOPED_ROLES_MIGRATION_GUIDE.md` Phase 5

### Phase 8: Deploy to Production
- When confident, deploy to production
- Monitor for issues

---

## 🎯 Role Mapping (When Adding Data)

### Global Roles → Org-Scoped Roles
```
admin       → org_admin
manager     → org_manager
accountant  → org_accountant
auditor     → org_auditor
viewer      → org_viewer
(default)   → org_viewer
```

### Global Roles → Project-Scoped Roles
```
admin       → project_manager
manager     → project_manager
accountant  → project_contributor
team_leader → project_contributor
auditor     → project_viewer
viewer      → project_viewer
(default)   → project_viewer
```

---

## 📚 Documentation

- `SCOPED_ROLES_MIGRATION_GUIDE.md` - Complete guide
- `SCOPED_ROLES_QUICK_START.md` - Quick reference
- `sql/add_scoped_roles_data_later.sql` - Data migration script
- `GLOBAL_VS_SCOPED_ROLES_ANALYSIS.md` - Architecture analysis

---

## ✅ Advantages of This Approach

1. **Clean Start** - No data conflicts
2. **Test First** - Can test with sample data
3. **Flexible** - Add data when ready
4. **Safe** - No automatic data migration
5. **Reversible** - Easy to rollback if needed
6. **Transparent** - You control when data is added

---

## 🔄 Rollback Plan

If something goes wrong:

### Option 1: Use Backup
```bash
psql your_database < backup_YYYYMMDD.sql
```

### Option 2: Drop New Tables
```sql
DROP TABLE IF EXISTS org_roles CASCADE;
DROP TABLE IF EXISTS project_roles CASCADE;
DROP TABLE IF EXISTS system_roles CASCADE;
```

---

## 📞 Troubleshooting

### Error: "table org_roles already exists"
- Tables already created
- Skip Phase 1 and 2
- Continue with Phase 3

### Error: "RLS policy already exists"
- Policies already created
- Skip Phase 3
- Continue with Phase 4

### No data in tables
- This is expected!
- Run `sql/add_scoped_roles_data_later.sql` when ready

### Data migration fails
- Check if old tables exist
- Verify column names
- Run diagnostic script first

---

## 🎓 Next Steps

1. **Deploy** - Run migrations 1-4
2. **Test** - Add sample data
3. **Verify** - Check permissions work
4. **Add Data** - Run data migration script when ready
5. **Update Frontend** - Implement Phase 5
6. **Go Live** - Deploy to production

---

**Status:** ✅ READY TO DEPLOY  
**Approach:** Clean (no data migration)  
**Risk:** LOW  
**Estimated Time:** 1-2 hours

---

**Key Point:** This creates the structure only. Add data later using `sql/add_scoped_roles_data_later.sql`
