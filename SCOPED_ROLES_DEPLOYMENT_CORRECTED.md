# Scoped Roles Migration - Corrected Deployment Guide

**Status:** ✅ READY TO DEPLOY (Schema Fixed)  
**Date:** January 26, 2026

---

## ⚡ Quick Start (3 Steps)

### Step 1: Backup Database
```bash
pg_dump your_database > backup_$(date +%Y%m%d).sql
```

### Step 2: Run Migrations (IN ORDER)
```bash
# Phase 1: Create tables
psql -f supabase/migrations/20260126_create_scoped_roles_tables.sql

# Phase 2: Migrate data (USE THE FIXED VERSION!)
psql -f supabase/migrations/20260126_migrate_to_scoped_roles_data_FIXED.sql

# Phase 3: Update RLS
psql -f supabase/migrations/20260126_update_rls_for_scoped_roles.sql

# Phase 4: Update RPC
psql -f supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql
```

### Step 3: Verify
```sql
SELECT 'system_roles', COUNT(*) FROM system_roles
UNION ALL
SELECT 'org_roles', COUNT(*) FROM org_roles
UNION ALL
SELECT 'project_roles', COUNT(*) FROM project_roles;
```

---

## 🔧 What Was Fixed

**Error:** `column ur.role does not exist`

**Cause:** Migration tried to use `user_roles.role` but your schema uses `user_profiles.role`

**Solution:** Updated migration to use correct schema

---

## 📋 Files to Use

### ✅ USE THESE (Correct)
- `supabase/migrations/20260126_create_scoped_roles_tables.sql`
- `supabase/migrations/20260126_migrate_to_scoped_roles_data_FIXED.sql` ← **FIXED VERSION**
- `supabase/migrations/20260126_update_rls_for_scoped_roles.sql`
- `supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql`

### ❌ DO NOT USE (Has Errors)
- `supabase/migrations/20260126_migrate_to_scoped_roles_data.sql` ← **OLD VERSION - BROKEN**

---

## 🧪 Optional: Run Diagnostic First

To see your actual schema structure:
```bash
psql -f sql/diagnose_scoped_roles_schema.sql
```

This shows:
- Table structures
- Column names and types
- Sample data
- Record counts

---

## 📊 What Gets Migrated

### System Roles (Global)
```
user_profiles.is_super_admin = true
    ↓
system_roles (user_id, role='super_admin')
```

### Organization Roles (Org-Scoped)
```
user_profiles.role + org_memberships
    ↓
org_roles (user_id, org_id, role)
```

### Project Roles (Project-Scoped)
```
user_profiles.role + project_memberships
    ↓
project_roles (user_id, project_id, role)
```

---

## ✅ Verification Queries

After migration, run these to verify:

```sql
-- Check record counts
SELECT 'system_roles', COUNT(*) FROM system_roles
UNION ALL
SELECT 'org_roles', COUNT(*) FROM org_roles
UNION ALL
SELECT 'project_roles', COUNT(*) FROM project_roles;

-- Check specific user
SELECT 'system' as scope, role FROM system_roles WHERE user_id = 'YOUR_USER_ID'
UNION ALL
SELECT 'org:' || org_id, role FROM org_roles WHERE user_id = 'YOUR_USER_ID'
UNION ALL
SELECT 'project:' || project_id, role FROM project_roles WHERE user_id = 'YOUR_USER_ID';

-- Check role distribution
SELECT role, COUNT(*) FROM org_roles GROUP BY role;
SELECT role, COUNT(*) FROM project_roles GROUP BY role;
```

---

## 🎯 Role Mapping

### Global Roles → Org-Scoped Roles
```
admin       → org_admin
manager     → org_manager
accountant  → org_accountant
auditor     → org_auditor
viewer      → org_viewer
(null)      → org_viewer (default)
```

### Global Roles → Project-Scoped Roles
```
admin       → project_manager
manager     → project_manager
accountant  → project_contributor
team_leader → project_contributor
auditor     → project_viewer
viewer      → project_viewer
(null)      → project_contributor (default)
```

---

## 🚀 Full Deployment Steps

### 1. Pre-Deployment
- [ ] Backup database
- [ ] Review this guide
- [ ] Test in development first

### 2. Phase 1: Create Tables
```bash
psql -f supabase/migrations/20260126_create_scoped_roles_tables.sql
```
- Creates `org_roles`, `project_roles`, `system_roles` tables
- Adds RLS policies
- Creates helper functions

### 3. Phase 2: Migrate Data (FIXED VERSION)
```bash
psql -f supabase/migrations/20260126_migrate_to_scoped_roles_data_FIXED.sql
```
- Migrates super admins to `system_roles`
- Migrates org memberships to `org_roles`
- Migrates project memberships to `project_roles`
- Creates compatibility views

### 4. Phase 3: Update RLS
```bash
psql -f supabase/migrations/20260126_update_rls_for_scoped_roles.sql
```
- Updates all RLS policies
- Uses new scoped roles tables
- Maintains security

### 5. Phase 4: Update RPC
```bash
psql -f supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql
```
- Updates `get_user_auth_data()` function
- Returns scoped roles
- Adds helper functions

### 6. Verify Migration
```sql
-- Run verification queries above
```

### 7. Update Frontend
- Update `src/hooks/useOptimizedAuth.ts`
- See `SCOPED_ROLES_MIGRATION_GUIDE.md` Phase 5

### 8. Test Thoroughly
- Test with different user types
- Verify access control
- Check UI shows/hides correctly

### 9. Deploy to Production
- When confident, deploy to production
- Monitor for issues
- Keep backup available

---

## 🔄 Rollback Plan

If something goes wrong:

### Option 1: Use Backup
```bash
psql your_database < backup_YYYYMMDD.sql
```

### Option 2: Use Compatibility Views
Old code continues to work with compatibility views:
- `org_memberships_compat`
- `project_memberships_compat`

### Option 3: Keep Both Systems
- Keep old tables
- Keep new tables
- Use feature flag to switch

---

## 📞 Troubleshooting

### Error: "column ur.role does not exist"
- ✅ FIXED - Use `20260126_migrate_to_scoped_roles_data_FIXED.sql`
- ❌ Don't use old version

### Error: "table org_roles already exists"
- Run Phase 1 only once
- If re-running, drop tables first:
  ```sql
  DROP TABLE IF EXISTS org_roles CASCADE;
  DROP TABLE IF EXISTS project_roles CASCADE;
  DROP TABLE IF EXISTS system_roles CASCADE;
  ```

### Error: "RLS policy already exists"
- Policies are created in Phase 3
- If re-running, drop policies first:
  ```sql
  DROP POLICY IF EXISTS "policy_name" ON table_name;
  ```

### No data migrated
- Check if `org_memberships` table exists
- Check if `user_profiles.role` column exists
- Run diagnostic script to verify schema

---

## 📚 Documentation

- `SCOPED_ROLES_SCHEMA_FIX.md` - What was fixed
- `SCOPED_ROLES_MIGRATION_GUIDE.md` - Complete guide
- `SCOPED_ROLES_QUICK_START.md` - Quick reference
- `sql/diagnose_scoped_roles_schema.sql` - Diagnostic script

---

## ✅ Checklist

### Before Deployment
- [ ] Backup database
- [ ] Review this guide
- [ ] Understand the changes
- [ ] Test in development

### During Deployment
- [ ] Run Phase 1 migration
- [ ] Run Phase 2 migration (FIXED VERSION)
- [ ] Run Phase 3 migration
- [ ] Run Phase 4 migration
- [ ] Verify data migration

### After Deployment
- [ ] Update frontend
- [ ] Test with different users
- [ ] Verify access control
- [ ] Monitor for issues

---

**Status:** ✅ READY TO DEPLOY  
**Confidence:** HIGH  
**Risk:** LOW (schema fixed, backward compatible)  
**Estimated Time:** 1-2 hours

---

**Key Point:** Use `20260126_migrate_to_scoped_roles_data_FIXED.sql` (not the old version)
