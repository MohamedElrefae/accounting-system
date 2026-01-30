# AI Agent Execution Plan - Enterprise Auth Security Fix (UPDATED)

**Date:** January 23, 2026  
**Updated:** January 25, 2026  
**Status:** 🚀 PHASE 0 COMPLETE - PHASE 1 IN PROGRESS  
**Priority:** 🔴 CRITICAL SECURITY FIX  
**Estimated Duration:** 1-2 weeks  
**Progress:** 4/28 tasks complete (14%)

---

## 📊 Current Status

### Phase Progress
- ✅ **Phase 0**: Quick Wins - **COMPLETE** (4/4 tasks) - Completed January 25, 2026
- 📋 **Phase 1**: Database Schema - **READY TO START** (0/6 tasks)
- 📋 **Phase 2**: Frontend Auth - **PENDING** (0/5 tasks)
- 📋 **Phase 3**: ScopeContext - **PENDING** (0/4 tasks)
- 📋 **Phase 4**: Route Protection - **PENDING** (0/5 tasks)
- 📋 **Phase 5**: Testing & Deploy - **PENDING** (0/7 tasks)

### What Was Completed (Phase 0)
✅ RLS policies deployed (10 policies)
✅ Org memberships verified (16 memberships)
✅ Current state documented (backup created)
✅ Quick wins tested (all tests passing)

---

## 📋 How to Use This Document

### For AI Agents
- Each task has a unique ID (e.g., `TASK-1.1`)
- Mark tasks as: `[COMPLETED]`, `[IN-PROGRESS]`, `[BLOCKED]`, `[PENDING]`
- Report progress using format: `Task X.Y: [STATUS] - [details]`
- Check acceptance criteria before marking complete
- Document any blockers or issues

### Progress Reporting Format
```
Task 1.1: [COMPLETED] - Database backup created successfully. Size: 45MB.
Task 1.2: [IN-PROGRESS] - Adding org_id column to user_roles table.
Task 1.3: [BLOCKED] - Waiting for TASK-1.2 completion before proceeding.
```

---

## ✅ PHASE 0: QUICK WINS (30 minutes) - COMPLETE

**Status:** ✅ **100% COMPLETE**  
**Completion Date:** January 25, 2026  
**Duration:** 30 minutes  
**All Tasks:** 4/4 COMPLETED

### Completed Tasks

| Task ID | Task Name | Status | Completed |
|---------|-----------|--------|-----------|
| TASK-0.1 | Deploy RLS Policy Fixes | ✅ COMPLETED | Jan 25 |
| TASK-0.2 | Verify Org Memberships | ✅ COMPLETED | Jan 25 |
| TASK-0.3 | Document Current State | ✅ COMPLETED | Jan 25 |
| TASK-0.4 | Test Quick Wins | ✅ COMPLETED | Jan 25 |

### Key Achievements
- ✅ 10 RLS policies deployed (2 per table × 5 tables)
- ✅ 16 org memberships verified
- ✅ All users have org assignments
- ✅ RLS policies enforced correctly
- ✅ Accountant sees only their orgs
- ✅ Super admin sees all orgs
- ✅ Backup created: `backups/enterprise_auth_backup_20260125.sql`
- ✅ All tests passing

### Issues Found
- None

### Ready for Phase 1
✅ **YES** - All prerequisites met, ready to proceed with Phase 1: Database Schema

---

## 🗄️ PHASE 1: DATABASE SCHEMA (2 days)

**Goal:** Add organization scoping to role assignments and create enhanced auth RPC  
**Priority:** HIGH  
**Risk Level:** Low (backward compatible)  
**Status:** 📋 READY TO START
**Estimated Duration:** 2 days  
**Estimated Start:** January 25, 2026  
**Estimated Completion:** January 27, 2026

---

### TASK-1.1: Backup Database

**Task ID:** `TASK-1.1`  
**Status:** [ ] PENDING  
**Estimated Time:** 30 minutes  
**Dependencies:** Phase 0 complete  
**Assigned To:** AI Agent  

#### Description
Create a complete database backup before making schema changes.

#### Deliverables
1. Full database backup file
2. Backup verification
3. Backup file location documented
4. Restore procedure documented

#### Implementation Steps
1. Use Supabase backup tools or pg_dump
2. Verify backup file is complete
3. Test restore procedure (optional, in staging)
4. Document backup location

#### Backup Commands
```bash
# Option 1: Supabase Dashboard
# Go to Database > Backups > Create Backup

# Option 2: pg_dump (if direct access available)
pg_dump -h [host] -U [user] -d [database] -F c -f backup_enterprise_auth_20260125.dump

# Option 3: SQL backup
pg_dump -h [host] -U [user] -d [database] --schema=public > backup_enterprise_auth_20260125.sql
```

#### Acceptance Criteria
- [ ] Backup file created successfully
- [ ] Backup file size > 0 bytes
- [ ] Backup includes all tables: user_roles, org_memberships, organizations, etc.
- [ ] Backup location documented
- [ ] Restore procedure documented

#### Verification
```bash
# Check backup file size
ls -lh backup_enterprise_auth_20260125.dump

# Verify backup contents (if SQL format)
grep -c "CREATE TABLE" backup_enterprise_auth_20260125.sql
# Expected: Multiple tables
```

#### Progress Report Template
```
Task 1.1: [STATUS] - Backup created at [location]. Size: [X MB]. Contains [Y] tables.
Example: Task 1.1: [COMPLETED] - Backup created at backups/backup_20260125.dump. Size: 45 MB. Contains 32 tables.
```

---

### TASK-1.2: Deploy Migration - Add org_id Column

**Task ID:** `TASK-1.2`  
**Status:** [ ] PENDING  
**Estimated Time:** 15 minutes  
**Dependencies:** TASK-1.1 (backup complete)  
**Assigned To:** AI Agent  

#### Description
Add organization_id column to user_roles table to enable org-scoped role assignments.

#### Deliverables
1. organization_id column added to user_roles
2. Indexes created for performance
3. Column comment added
4. Migration verified

#### Implementation Steps
1. Open Supabase SQL Editor
2. Run migration file: `supabase/migrations/20260123_add_org_id_to_user_roles.sql`
3. Verify column added successfully
4. Check indexes created

#### Migration File Location
```
supabase/migrations/20260123_add_org_id_to_user_roles.sql
```

#### Key SQL Commands
```sql
-- Add column
ALTER TABLE user_roles 
ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Create indexes
CREATE INDEX idx_user_roles_org_id ON user_roles(organization_id);
CREATE INDEX idx_user_roles_user_org ON user_roles(user_id, organization_id);

-- Add comment
COMMENT ON COLUMN user_roles.organization_id IS 
  'Organization scope for this role assignment. NULL = global role (super_admin only)';
```

#### Acceptance Criteria
- [ ] Migration executes without errors
- [ ] organization_id column exists in user_roles table
- [ ] Column type is UUID
- [ ] Foreign key constraint exists (references organizations.id)
- [ ] Indexes created: idx_user_roles_org_id, idx_user_roles_user_org
- [ ] Column comment added

#### Verification Query
```sql
-- Check column exists
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_roles'
AND column_name = 'organization_id';

-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_roles'
AND indexname LIKE '%org%';

-- Check foreign key
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'user_roles'
AND tc.constraint_type = 'FOREIGN KEY'
AND kcu.column_name = 'organization_id';
```

#### Rollback Procedure
```sql
-- Remove column (if needed)
ALTER TABLE user_roles DROP COLUMN organization_id;

-- Drop indexes (if needed)
DROP INDEX IF EXISTS idx_user_roles_org_id;
DROP INDEX IF EXISTS idx_user_roles_user_org;
```

#### Progress Report Template
```
Task 1.2: [STATUS] - Column added. Indexes: [created/failed]. Verification: [passed/failed].
Example: Task 1.2: [COMPLETED] - organization_id column added. 2 indexes created. Foreign key constraint verified.
```

---

### TASK-1.3: Migrate Existing Data

**Task ID:** `TASK-1.3`  
**Status:** [ ] PENDING  
**Estimated Time:** 10 minutes  
**Dependencies:** TASK-1.2 (column added)  
**Assigned To:** AI Agent  

#### Description
Migrate existing user_roles data to set organization_id based on user's primary organization.

#### Deliverables
1. All non-super_admin roles have organization_id set
2. Super_admin roles remain NULL (global)
3. Data migration verified
4. Migration results documented

#### Implementation Steps
1. Run data migration query
2. Verify all roles updated correctly
3. Check for any unmigrated roles
4. Document results

#### Migration Query
```sql
-- Set organization_id for existing roles based on user's default org
UPDATE user_roles ur
SET organization_id = (
  SELECT org_id 
  FROM org_memberships om 
  WHERE om.user_id = ur.user_id 
  AND om.is_default = true
  LIMIT 1
)
WHERE ur.organization_id IS NULL
AND EXISTS (
  SELECT 1 FROM roles r 
  WHERE r.id = ur.role_id 
  AND r.name != 'super_admin'
);

-- Verify migration
SELECT 
  COUNT(*) as total_roles,
  COUNT(organization_id) as roles_with_org,
  COUNT(*) - COUNT(organization_id) as roles_without_org
FROM user_roles;
```

#### Acceptance Criteria
- [ ] Migration query executes without errors
- [ ] All non-super_admin roles have organization_id set
- [ ] Super_admin roles have organization_id = NULL
- [ ] No roles left unmigrated (except super_admin)
- [ ] Results match expected counts

#### Verification Query
```sql
-- Check migration results
SELECT 
  r.name as role,
  COUNT(*) as total,
  COUNT(ur.organization_id) as with_org,
  COUNT(*) - COUNT(ur.organization_id) as without_org
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
GROUP BY r.name
ORDER BY r.name;

-- Expected results:
-- super_admin: with_org = 0, without_org = X (all NULL)
-- accountant: with_org = X, without_org = 0 (all have org)
-- admin: with_org = X, without_org = 0 (all have org)

-- Check for unmigrated roles (should be 0 or only super_admin)
SELECT 
  ur.id,
  up.email,
  r.name as role,
  ur.organization_id
FROM user_roles ur
JOIN user_profiles up ON up.id = ur.user_id
JOIN roles r ON r.id = ur.role_id
WHERE ur.organization_id IS NULL
ORDER BY r.name, up.email;
```

#### Issues to Watch For
- ⚠️ Users without default org (migration will fail for them)
- ⚠️ Non-super_admin roles still NULL (data issue)
- ⚠️ Super_admin roles with org_id (should be NULL)

#### Progress Report Template
```
Task 1.3: [STATUS] - Migrated X roles. Y roles with org_id. Z roles without (super_admin).
Example: Task 1.3: [COMPLETED] - Migrated 23 roles. 23 roles with org_id. 2 roles without (super_admin).
```

---

### TASK-1.4: Deploy Migration - Enhanced Auth RPC

**Task ID:** `TASK-1.4`  
**Status:** [ ] PENDING  
**Estimated Time:** 15 minutes  
**Dependencies:** TASK-1.3 (data migrated)  
**Assigned To:** AI Agent  

#### Description
Create enhanced auth RPC function that returns user profile, roles, and org/project memberships.

#### Deliverables
1. get_user_auth_data_with_scope() function created
2. Helper functions created
3. Permissions granted
4. Function verified

#### Implementation Steps
1. Open Supabase SQL Editor
2. Run migration file: `supabase/migrations/20260123_create_enhanced_auth_rpc.sql`
3. Verify functions created
4. Test function execution

#### Migration File Location
```
supabase/migrations/20260123_create_enhanced_auth_rpc.sql
```

#### Key Functions Created
```sql
-- Main function
CREATE FUNCTION get_user_auth_data_with_scope(p_user_id UUID) RETURNS JSON;

-- Helper functions
CREATE FUNCTION user_belongs_to_org(p_user_id UUID, p_org_id UUID) RETURNS BOOLEAN;
CREATE FUNCTION user_can_access_project(p_user_id UUID, p_project_id UUID) RETURNS BOOLEAN;
CREATE FUNCTION get_user_roles_in_org(p_user_id UUID, p_org_id UUID) RETURNS TEXT[];
CREATE FUNCTION get_user_permissions_in_org(p_user_id UUID, p_org_id UUID) RETURNS JSON;
```

#### Acceptance Criteria
- [ ] Migration executes without errors
- [ ] get_user_auth_data_with_scope() function exists
- [ ] All helper functions exist
- [ ] Functions have SECURITY DEFINER
- [ ] EXECUTE permission granted to authenticated role
- [ ] Function comments added

#### Verification Query
```sql
-- Check functions exist
SELECT 
  routine_name,
  routine_type,
  security_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%auth%scope%'
OR routine_name LIKE '%belongs_to_org%'
OR routine_name LIKE '%can_access_project%'
OR routine_name LIKE '%roles_in_org%'
OR routine_name LIKE '%permissions_in_org%'
ORDER BY routine_name;

-- Expected: 5 functions
-- - get_user_auth_data_with_scope
-- - user_belongs_to_org
-- - user_can_access_project
-- - get_user_roles_in_org
-- - get_user_permissions_in_org

-- Check permissions
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
AND routine_name = 'get_user_auth_data_with_scope';

-- Expected: authenticated role has EXECUTE permission
```

#### Rollback Procedure
```sql
-- Drop functions (if needed)
DROP FUNCTION IF EXISTS get_user_auth_data_with_scope(UUID);
DROP FUNCTION IF EXISTS user_belongs_to_org(UUID, UUID);
DROP FUNCTION IF EXISTS user_can_access_project(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_roles_in_org(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_permissions_in_org(UUID, UUID);
```

#### Progress Report Template
```
Task 1.4: [STATUS] - Created X functions. Permissions: [granted/failed]. Verification: [passed/failed].
Example: Task 1.4: [COMPLETED] - Created 5 functions. Permissions granted to authenticated role. All functions verified.
```

---

### TASK-1.5: Test Enhanced RPC

**Task ID:** `TASK-1.5`  
**Status:** [ ] PENDING  
**Estimated Time:** 10 minutes  
**Dependencies:** TASK-1.4 (RPC created)  
**Assigned To:** AI Agent  

#### Description
Test enhanced auth RPC function with real user data to verify it returns correct information.

#### Deliverables
1. Test results for accountant user
2. Test results for admin user
3. Test results for super_admin user
4. Verification that data structure is correct

#### Implementation Steps
1. Identify test users
2. Call enhanced RPC for each user
3. Verify returned data structure
4. Check data accuracy

#### Test Queries
```sql
-- Test 1: Call RPC for accountant user
SELECT get_user_auth_data_with_scope('accountant-user-id-here');

-- Expected result structure:
{
  "profile": {
    "id": "user-id",
    "email": "accountant@example.com",
    ...
  },
  "roles": ["accountant"],
  "organizations": ["org-1-uuid", "org-2-uuid"],
  "projects": ["proj-1-uuid"],
  "org_roles": {
    "org-1-uuid": ["accountant"],
    "org-2-uuid": ["viewer"]
  },
  "default_org": "org-1-uuid"
}

-- Test 2: Test helper functions
SELECT user_belongs_to_org('user-id', 'org-1-uuid');
-- Expected: true (if user belongs to org-1)

SELECT user_belongs_to_org('user-id', 'other-org-uuid');
-- Expected: false (if user doesn't belong to other-org)

SELECT user_can_access_project('user-id', 'proj-1-uuid');
-- Expected: true (if user can access proj-1)

SELECT get_user_roles_in_org('user-id', 'org-1-uuid');
-- Expected: ['accountant'] or similar

SELECT get_user_permissions_in_org('user-id', 'org-1-uuid');
-- Expected: JSON with permissions
```

#### Acceptance Criteria
- [ ] RPC executes without errors
- [ ] Returns valid JSON structure
- [ ] Profile data is correct
- [ ] Roles array is correct
- [ ] Organizations array contains user's orgs
- [ ] Projects array contains user's projects
- [ ] org_roles map is correct
- [ ] default_org is set correctly
- [ ] Helper functions return correct results

#### Data Structure Validation
```typescript
// Expected TypeScript interface
interface EnhancedAuthData {
  profile: {
    id: string;
    email: string;
    // ... other profile fields
  };
  roles: string[];  // e.g., ["accountant"]
  organizations: string[];  // e.g., ["org-1-uuid", "org-2-uuid"]
  projects: string[];  // e.g., ["proj-1-uuid"]
  org_roles: {
    [orgId: string]: string[];  // e.g., {"org-1-uuid": ["accountant"]}
  };
  default_org: string | null;  // e.g., "org-1-uuid"
}
```

#### Issues to Watch For
- ⚠️ RPC returns NULL (function error)
- ⚠️ Empty organizations array (user not in org_memberships)
- ⚠️ Incorrect org_roles mapping
- ⚠️ default_org is NULL (user has no default org)

#### Progress Report Template
```
Task 1.5: [STATUS] - Tested with X users. Data structure: [correct/incorrect]. Issues: [none/list].
Example: Task 1.5: [COMPLETED] - Tested with 3 users. Data structure correct. All fields populated. No issues.
```

---

### TASK-1.6: Verify Database Changes

**Task ID:** `TASK-1.6`  
**Status:** [ ] PENDING  
**Estimated Time:** 10 minutes  
**Dependencies:** TASK-1.5 (RPC tested)  
**Assigned To:** AI Agent  

#### Description
Comprehensive verification that all database changes are correct and complete.

#### Deliverables
1. Schema verification report
2. Data integrity check
3. Performance check
4. Final verification document

#### Implementation Steps
1. Run all verification queries
2. Check for any issues
3. Verify performance is acceptable
4. Document results

#### Verification Queries
```sql
-- Verification 1: Check user_roles schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;

-- Verification 2: Check all roles have org_id (except super_admin)
SELECT 
  r.name as role,
  COUNT(*) as total,
  COUNT(ur.organization_id) as with_org,
  COUNT(*) FILTER (WHERE ur.organization_id IS NULL) as without_org
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
GROUP BY r.name
ORDER BY r.name;

-- Verification 3: Check functions exist
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
  routine_name LIKE '%auth%scope%'
  OR routine_name LIKE '%belongs_to_org%'
  OR routine_name LIKE '%can_access_project%'
  OR routine_name LIKE '%roles_in_org%'
  OR routine_name LIKE '%permissions_in_org%'
)
ORDER BY routine_name;

-- Verification 4: Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_roles'
ORDER BY indexname;

-- Verification 5: Performance check
EXPLAIN ANALYZE
SELECT * FROM user_roles 
WHERE user_id = 'test-user-id' 
AND organization_id = 'test-org-id';
-- Should use index idx_user_roles_user_org
```

#### Acceptance Criteria
- [ ] user_roles has organization_id column
- [ ] All non-super_admin roles have organization_id
- [ ] All 5 functions exist
- [ ] All indexes exist
- [ ] Performance is acceptable (< 50ms)
- [ ] No data integrity issues

#### Performance Targets
| Query Type | Target | Acceptable |
|-----------|--------|------------|
| Get user roles | < 10ms | < 50ms |
| Check org membership | < 5ms | < 20ms |
| Enhanced RPC call | < 50ms | < 200ms |

#### Progress Report Template
```
Task 1.6: [STATUS] - Schema: [verified/issues]. Data: [verified/issues]. Performance: [acceptable/slow].
Example: Task 1.6: [COMPLETED] - Schema verified. All data migrated. Performance < 50ms. No issues found.
```

---

## ✅ PHASE 1 COMPLETION CHECKLIST

### All Tasks Complete
- [ ] TASK-1.1: Database backed up
- [ ] TASK-1.2: org_id column added
- [ ] TASK-1.3: Existing data migrated
- [ ] TASK-1.4: Enhanced RPC created
- [ ] TASK-1.5: RPC tested
- [ ] TASK-1.6: Changes verified

### Verification
- [ ] organization_id column exists in user_roles
- [ ] All non-super_admin roles have org_id
- [ ] Enhanced RPC returns correct data
- [ ] Helper functions work correctly
- [ ] Performance is acceptable
- [ ] No errors in database logs

### Documentation
- [ ] Progress report completed for all tasks
- [ ] Backup file location documented
- [ ] Any issues documented
- [ ] Rollback procedures tested (if needed)

### Sign-Off
```
Phase 1 Completion Report:
- Completed: [Date/Time]
- All tasks: [COMPLETED/BLOCKED]
- Database changes: [verified/issues]
- Performance: [acceptable/needs optimization]
- Issues found: [None/List issues]
- Ready for Phase 2: [YES/NO]
- Notes: [Any additional notes]
```

---

## 📋 PHASES 2-5 (To Be Completed)

The remaining phases (2-5) follow the same structure as Phase 1:

- **Phase 2**: Frontend Auth Integration (5 tasks)
- **Phase 3**: ScopeContext Validation (4 tasks)
- **Phase 4**: Route Protection (5 tasks)
- **Phase 5**: Testing & Deployment (7 tasks)

Each phase contains detailed task descriptions, acceptance criteria, verification queries, and progress reporting templates.

---

## 📊 Overall Progress Summary

| Phase | Tasks | Status | Completion |
|-------|-------|--------|-----------|
| Phase 0 | 4 | ✅ COMPLETE | 100% |
| Phase 1 | 6 | 📋 READY | 0% |
| Phase 2 | 5 | 📋 PENDING | 0% |
| Phase 3 | 4 | 📋 PENDING | 0% |
| Phase 4 | 5 | 📋 PENDING | 0% |
| Phase 5 | 7 | 📋 PENDING | 0% |
| **TOTAL** | **28** | **14% COMPLETE** | **4/28** |

---

## 🚀 Next Action

**Begin Phase 1: Database Schema**

1. Start with TASK-1.1: Backup Database
2. Follow tasks in order (1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6)
3. Complete all acceptance criteria before moving to next task
4. Report progress using provided templates
5. Document any issues or blockers

---

**Status**: 🚀 PHASE 0 COMPLETE - PHASE 1 READY TO START  
**Last Updated**: January 25, 2026  
**Next Review**: After Phase 1 completion

