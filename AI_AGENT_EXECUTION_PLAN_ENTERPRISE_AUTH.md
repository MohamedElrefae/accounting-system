# AI Agent Execution Plan - Enterprise Auth Security Fix

**Date:** January 23, 2026  
**Updated:** January 25, 2026  
**Status:** 🚀 PHASE 0 COMPLETE - PHASE 1 READY TO START  
**Priority:** 🔴 CRITICAL SECURITY FIX  
**Estimated Duration:** 1-2 weeks  
**Progress:** 4/28 tasks complete (14%)

---

## 📊 Current Status

### Phase Progress
- ✅ **Phase 0**: Quick Wins - **COMPLETE** (4/4 tasks) - Completed January 25, 2026
- 📋 **Phase 1**: Database Schema - **READY TO START** (0/6 tasks)
- 📋 **Phase 2**: Frontend Auth Integration - **PENDING** (0/5 tasks)
- 📋 **Phase 3**: ScopeContext Validation - **PENDING** (0/4 tasks)
- 📋 **Phase 4**: Route Protection - **PENDING** (0/5 tasks)
- 📋 **Phase 5**: Testing & Deployment - **PENDING** (0/7 tasks)

### What Was Completed (Phase 0)
✅ RLS policies deployed (10 policies)
✅ Org memberships verified (16 memberships)
✅ Current state documented (backup created)
✅ Quick wins tested (all tests passing)  

---

## 📋 How to Use This Document

### For AI Agents
- Each task has a unique ID (e.g., `TASK-0.1`)
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

## 🎯 Project Overview

### Critical Issue
Accountant role users can access and modify data from organizations they shouldn't have access to.

### Solution
Implement 3-layer security architecture:
1. **Database Security (RLS Policies)** - Block unauthorized queries
2. **Backend Enhancement (Enhanced Auth RPC)** - Load org/project memberships
3. **Frontend Validation (Scope Enforcement)** - Validate org selection

### Success Criteria
- ✅ Accountant cannot access unauthorized organizations
- ✅ RLS policies enforce data isolation
- ✅ Frontend validates scope before allowing access
- ✅ Clear error messages for unauthorized attempts
- ✅ No performance degradation

---

## 📊 Task Tracking Dashboard

### Phase 0: Quick Wins (30 minutes)
- [ ] TASK-0.1: Deploy RLS Policy Fixes
- [ ] TASK-0.2: Verify Org Memberships
- [ ] TASK-0.3: Document Current State
- [ ] TASK-0.4: Test Quick Wins

### Phase 1: Database Schema (2 days)
- [ ] TASK-1.1: Backup Database
- [ ] TASK-1.2: Deploy Migration - Add org_id Column
- [ ] TASK-1.3: Migrate Existing Data
- [ ] TASK-1.4: Deploy Migration - Enhanced Auth RPC
- [ ] TASK-1.5: Test Enhanced RPC
- [ ] TASK-1.6: Verify Database Changes

### Phase 2: Frontend Auth Integration (3 days)
- [ ] TASK-2.1: Update useOptimizedAuth Interface
- [ ] TASK-2.2: Update loadAuthData Function
- [ ] TASK-2.3: Add Scope Validation Functions
- [ ] TASK-2.4: Export New Functions
- [ ] TASK-2.5: Test Auth Hook Changes

### Phase 3: ScopeContext Validation (2 days)
- [ ] TASK-3.1: Update setOrganization Function
- [ ] TASK-3.2: Update setProject Function
- [ ] TASK-3.3: Add Error Handling
- [ ] TASK-3.4: Test ScopeContext Changes

### Phase 4: Route Protection (2 days)
- [ ] TASK-4.1: Update OptimizedProtectedRoute Props
- [ ] TASK-4.2: Add Org Access Validation
- [ ] TASK-4.3: Add Route Param Validation
- [ ] TASK-4.4: Update Route Definitions
- [ ] TASK-4.5: Test Route Protection

### Phase 5: Testing & Deployment (2 days)
- [ ] TASK-5.1: Run Unit Tests
- [ ] TASK-5.2: Run Integration Tests
- [ ] TASK-5.3: Run E2E Tests
- [ ] TASK-5.4: Performance Testing
- [ ] TASK-5.5: User Acceptance Testing
- [ ] TASK-5.6: Production Deployment
- [ ] TASK-5.7: Post-Deployment Monitoring

---

## 🚀 PHASE 0: QUICK WINS (30 minutes)

**Goal:** Deploy immediate security improvements with minimal risk  
**Priority:** CRITICAL - Deploy first  
**Risk Level:** Very Low  
**Status:** ✅ **COMPLETE** (January 25, 2026)

---

### TASK-0.1: Deploy RLS Policy Fixes

**Task ID:** `TASK-0.1`  
**Status:** ✅ **COMPLETED**  
**Estimated Time:** 10 minutes  
**Dependencies:** None  
**Assigned To:** AI Agent  
**Completed Date:** January 25, 2026

#### Description
Deploy Row Level Security (RLS) policy fixes to immediately block unauthorized cross-organization access at the database level.

#### Completion Summary
✅ **COMPLETED** - RLS policies deployed successfully on January 25, 2026

**Results:**
- 10 RLS policies deployed (2 per table × 5 tables)
- Debug policies removed
- Org-scoped policies created
- Super admin bypass policies added
- All policies verified working correctly

#### Implementation Steps
1. Open Supabase SQL Editor
2. Run file: `sql/quick_wins_fix_rls_policies.sql`
3. Verify no errors in execution
4. Check policies created successfully

#### SQL Script Location
```
sql/quick_wins_fix_rls_policies.sql
```

#### Acceptance Criteria
- [ ] All SQL commands execute without errors
- [ ] Debug policies (`USING (true)`) are removed
- [ ] New org-scoped policies exist for: organizations, projects, transactions
- [ ] Super admin bypass policies exist
- [ ] Query `SELECT * FROM pg_policies WHERE schemaname = 'public'` shows new policies

#### Verification Query
```sql
-- Check new policies exist
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('organizations', 'projects', 'transactions')
ORDER BY tablename, policyname;

-- Expected: Should see policies like:
-- - users_see_their_orgs
-- - users_see_org_projects
-- - users_see_org_transactions
-- - super_admin_full_access
```

#### Rollback Procedure
```sql
-- Restore original policies (documented in quick_wins script)
-- See sql/quick_wins_fix_rls_policies.sql section: "ROLLBACK COMMANDS"
```

#### Progress Report Template
```
Task 0.1: [STATUS] - [Details about deployment, any errors, verification results]
Example: Task 0.1: [COMPLETED] - RLS policies deployed. 8 policies created. Verification query shows all expected policies.
```

---

### TASK-0.2: Verify Org Memberships

**Task ID:** `TASK-0.2`  
**Status:** [ ] PENDING  
**Estimated Time:** 5 minutes  
**Dependencies:** None  
**Assigned To:** AI Agent  

#### Description
Verify that org_memberships table has data and users are properly assigned to organizations.

#### Deliverables
1. ✅ Count of org_memberships rows
2. ✅ List of users and their organizations
3. ✅ Identification of any users without org assignments
4. ✅ Documentation of current state

#### Implementation Steps
1. Run verification queries
2. Document results
3. Identify any data issues
4. Report findings

#### Verification Queries
```sql
-- Query 1: Count org memberships
SELECT COUNT(*) as total_memberships FROM org_memberships;
-- Expected: 16 rows (from schema analysis)

-- Query 2: List all user-org assignments
SELECT 
  om.user_id,
  up.email,
  om.org_id,
  o.name as org_name,
  om.is_default,
  om.can_access_all_projects
FROM org_memberships om
JOIN user_profiles up ON up.id = om.user_id
JOIN organizations o ON o.id = om.org_id
ORDER BY up.email, o.name;

-- Query 3: Find users without org assignments
SELECT 
  up.id,
  up.email,
  up.created_at
FROM user_profiles up
WHERE NOT EXISTS (
  SELECT 1 FROM org_memberships om 
  WHERE om.user_id = up.id
)
ORDER BY up.email;

-- Query 4: Find users without default org
SELECT 
  up.id,
  up.email
FROM user_profiles up
WHERE EXISTS (
  SELECT 1 FROM org_memberships om WHERE om.user_id = up.id
)
AND NOT EXISTS (
  SELECT 1 FROM org_memberships om 
  WHERE om.user_id = up.id AND om.is_default = true
)
ORDER BY up.email;
```

#### Acceptance Criteria
- [ ] org_memberships table has > 0 rows
- [ ] All active users have at least one org assignment
- [ ] Each user has exactly one default org (is_default = true)
- [ ] Results documented in progress report

#### Issues to Watch For
- ⚠️ Users with no org assignments (will be blocked after RLS deployment)
- ⚠️ Users with multiple default orgs (data inconsistency)
- ⚠️ Empty org_memberships table (critical blocker)

#### Progress Report Template
```
Task 0.2: [STATUS] - Found X org memberships. Y users have assignments. Z users missing assignments.
Example: Task 0.2: [COMPLETED] - Found 16 org memberships. All 8 users have assignments. 0 users missing assignments.
```

---

### TASK-0.3: Document Current State

**Task ID:** `TASK-0.3`  
**Status:** [ ] PENDING  
**Estimated Time:** 10 minutes  
**Dependencies:** None  
**Assigned To:** AI Agent  

#### Description
Create a snapshot of current RLS policies and permissions for rollback purposes.

#### Deliverables
1. ✅ Backup of current RLS policies
2. ✅ Backup of current user_roles data
3. ✅ Backup of current org_memberships data
4. ✅ Documentation file created

#### Implementation Steps
1. Run backup queries
2. Save results to file
3. Document current state
4. Verify backup is complete

#### Backup Queries
```sql
-- Backup 1: Current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Backup 2: Current user_roles
SELECT 
  ur.id,
  ur.user_id,
  up.email,
  ur.role_id,
  r.name as role_name,
  ur.is_active,
  ur.created_at
FROM user_roles ur
JOIN user_profiles up ON up.id = ur.user_id
JOIN roles r ON r.id = ur.role_id
ORDER BY up.email, r.name;

-- Backup 3: Current org_memberships
SELECT 
  om.id,
  om.user_id,
  up.email,
  om.org_id,
  o.name as org_name,
  om.is_default,
  om.can_access_all_projects,
  om.created_at
FROM org_memberships om
JOIN user_profiles up ON up.id = om.user_id
JOIN organizations o ON o.id = om.org_id
ORDER BY up.email, o.name;
```

#### Deliverable File
Create file: `backups/enterprise_auth_backup_YYYYMMDD.sql`

#### Acceptance Criteria
- [ ] All backup queries executed successfully
- [ ] Results saved to backup file
- [ ] Backup file contains all current policies
- [ ] Backup file contains all user_roles data
- [ ] Backup file contains all org_memberships data
- [ ] File location documented in progress report

#### Progress Report Template
```
Task 0.3: [STATUS] - Backup created at [file path]. Contains X policies, Y user roles, Z org memberships.
Example: Task 0.3: [COMPLETED] - Backup created at backups/enterprise_auth_backup_20260123.sql. Contains 12 policies, 25 user roles, 16 org memberships.
```

---

### TASK-0.4: Test Quick Wins

**Task ID:** `TASK-0.4`  
**Status:** [ ] PENDING  
**Estimated Time:** 5 minutes  
**Dependencies:** TASK-0.1 (RLS policies deployed)  
**Assigned To:** AI Agent  

#### Description
Test that RLS policies are working correctly and accountant users can only see their organizations.

#### Deliverables
1. ✅ Test results for accountant user
2. ✅ Test results for admin user
3. ✅ Test results for super_admin user
4. ✅ Verification that policies work as expected

#### Implementation Steps
1. Identify test users (accountant, admin, super_admin)
2. Run test queries for each user
3. Verify results match expectations
4. Document any issues

#### Test Queries
```sql
-- Test 1: Accountant sees only their orgs
-- Login as accountant user (or use SET LOCAL for testing)
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "accountant-user-id-here"}';

SELECT COUNT(*) as visible_orgs FROM organizations;
-- Expected: 1-2 (only their orgs)

SELECT id, name FROM organizations ORDER BY name;
-- Expected: Only orgs where user is in org_memberships

-- Test 2: Accountant cannot see other org's transactions
SELECT COUNT(*) as visible_transactions FROM transactions;
-- Expected: Only transactions from their orgs

-- Test 3: Super admin sees everything
SET LOCAL request.jwt.claims TO '{"sub": "super-admin-user-id-here"}';

SELECT COUNT(*) as visible_orgs FROM organizations;
-- Expected: All organizations

-- Test 4: Verify RLS is enforced
-- Try to query org user doesn't belong to
SET LOCAL request.jwt.claims TO '{"sub": "accountant-user-id-here"}';

SELECT * FROM organizations WHERE id = 'other-org-uuid';
-- Expected: 0 rows (blocked by RLS)
```

#### Acceptance Criteria
- [ ] Accountant user sees only their organizations (not all)
- [ ] Accountant user sees only their org's transactions
- [ ] Super admin user sees all organizations
- [ ] RLS blocks queries for unauthorized orgs
- [ ] No errors in query execution

#### Expected Results
| User Role | Organizations Visible | Transactions Visible |
|-----------|----------------------|---------------------|
| Accountant | 1-2 (their orgs) | Only their org's |
| Admin | 1-3 (their orgs) | Only their org's |
| Super Admin | All (10+) | All |

#### Issues to Watch For
- ⚠️ Accountant still sees all orgs (RLS not working)
- ⚠️ Super admin blocked (bypass policy not working)
- ⚠️ Errors in query execution (policy syntax issues)

#### Progress Report Template
```
Task 0.4: [STATUS] - Accountant sees X orgs (expected 1-2). Super admin sees Y orgs (expected all). [Any issues]
Example: Task 0.4: [COMPLETED] - Accountant sees 2 orgs (expected 1-2). Super admin sees 12 orgs (expected all). RLS working correctly.
```

---

## ✅ PHASE 0 COMPLETION CHECKLIST

### All Tasks Complete
- [ ] TASK-0.1: RLS policies deployed
- [ ] TASK-0.2: Org memberships verified
- [ ] TASK-0.3: Current state documented
- [ ] TASK-0.4: Quick wins tested

### Verification
- [ ] Accountant cannot see unauthorized orgs
- [ ] Super admin can see all orgs
- [ ] No errors in database logs
- [ ] Backup file created

### Documentation
- [ ] Progress report completed for all tasks
- [ ] Any issues documented
- [ ] Rollback procedure tested (if needed)

### Sign-Off
```
Phase 0 Completion Report:
- Completed: [Date/Time]
- All tasks: [COMPLETED/BLOCKED]
- Issues found: [None/List issues]
- Ready for Phase 1: [YES/NO]
- Notes: [Any additional notes]
```

---

## 🗄️ PHASE 1: DATABASE SCHEMA (2 days)

**Goal:** Add organization scoping to role assignments and create enhanced auth RPC  
**Priority:** HIGH  
**Risk Level:** Low (backward compatible)  

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
1. ✅ Full database backup file
2. ✅ Backup verification
3. ✅ Backup file location documented
4. ✅ Restore procedure documented

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
pg_dump -h [host] -U [user] -d [database] -F c -f backup_enterprise_auth_20260123.dump

# Option 3: SQL backup
pg_dump -h [host] -U [user] -d [database] --schema=public > backup_enterprise_auth_20260123.sql
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
ls -lh backup_enterprise_auth_20260123.dump

# Verify backup contents (if SQL format)
grep -c "CREATE TABLE" backup_enterprise_auth_20260123.sql
# Expected: Multiple tables
```

#### Progress Report Template
```
Task 1.1: [STATUS] - Backup created at [location]. Size: [X MB]. Contains [Y] tables.
Example: Task 1.1: [COMPLETED] - Backup created at backups/backup_20260123.dump. Size: 45 MB. Contains 32 tables.
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
1. ✅ organization_id column added to user_roles
2. ✅ Indexes created for performance
3. ✅ Column comment added
4. ✅ Migration verified

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
1. ✅ All non-super_admin roles have organization_id set
2. ✅ Super_admin roles remain NULL (global)
3. ✅ Data migration verified
4. ✅ Migration results documented

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
1. ✅ get_user_auth_data_with_scope() function created
2. ✅ Helper functions created
3. ✅ Permissions granted
4. ✅ Function verified

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
1. ✅ Test results for accountant user
2. ✅ Test results for admin user
3. ✅ Test results for super_admin user
4. ✅ Verification that data structure is correct

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
1. ✅ Schema verification report
2. ✅ Data integrity check
3. ✅ Performance check
4. ✅ Final verification document

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

## 🎨 PHASE 2: FRONTEND AUTH INTEGRATION (3 days)

**Goal:** Update frontend auth system to load and validate org/project memberships  
**Priority:** HIGH  
**Risk Level:** Low (incremental changes)  

---

### TASK-2.1: Update useOptimizedAuth Interface

**Task ID:** `TASK-2.1`  
**Status:** [ ] PENDING  
**Estimated Time:** 30 minutes  
**Dependencies:** Phase 1 complete  
**Assigned To:** AI Agent  

#### Description
Update the useOptimizedAuth hook interface to include scope-aware fields.

#### Deliverables
1. ✅ Updated TypeScript interface
2. ✅ New state fields added
3. ✅ Type definitions updated
4. ✅ Code compiles without errors

#### Implementation Steps
1. Open file: `src/hooks/useOptimizedAuth.ts`
2. Update OptimizedAuthState interface
3. Add new type definitions
4. Verify TypeScript compilation

#### Code Changes
```typescript
// File: src/hooks/useOptimizedAuth.ts

// ADD: New interface fields
interface OptimizedAuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  roles: RoleSlug[];
  resolvedPermissions: ResolvedRole | null;
  
  // NEW: Scope-aware fields
  userOrganizations: string[];           // Array of org IDs user belongs to
  userProjects: string[];                // Array of project IDs user can access
  orgRoles: Map<string, RoleSlug[]>;     // Map of org ID to roles in that org
  defaultOrgId: string | null;           // User's default organization ID
}

// ADD: New return type fields
interface UseOptimizedAuthReturn {
  // ... existing fields
  
  // NEW: Scope validation functions
  userOrganizations: string[];
  userProjects: string[];
  defaultOrgId: string | null;
  belongsToOrg: (orgId: string) => boolean;
  canAccessProject: (projectId: string) => boolean;
  getRolesInOrg: (orgId: string) => RoleSlug[];
  hasActionAccessInOrg: (action: PermissionCode, orgId: string) => boolean;
}
```

#### Acceptance Criteria
- [ ] Interface updated with new fields
- [ ] TypeScript compiles without errors
- [ ] No breaking changes to existing code
- [ ] Type definitions are correct
- [ ] JSDoc comments added

#### Verification
```bash
# Check TypeScript compilation
npm run type-check

# Expected: No errors related to useOptimizedAuth
```

#### Progress Report Template
```
Task 2.1: [STATUS] - Interface updated. TypeScript: [compiled/errors]. Breaking changes: [none/list].
Example: Task 2.1: [COMPLETED] - Interface updated with 4 new fields. TypeScript compiles. No breaking changes.
```

---

### TASK-2.2: Update loadAuthData Function

**Task ID:** `TASK-2.2`  
**Status:** [ ] PENDING  
**Estimated Time:** 1 hour  
**Dependencies:** TASK-2.1 (interface updated)  
**Assigned To:** AI Agent  

#### Description
Update the loadAuthData function to call enhanced RPC and populate scope fields.

#### Deliverables
1. ✅ Enhanced RPC call added
2. ✅ Scope data processing logic
3. ✅ Error handling added
4. ✅ Function tested

#### Implementation Steps
1. Open file: `src/hooks/useOptimizedAuth.ts`
2. Find loadAuthData function
3. Add enhanced RPC call after existing auth call
4. Process and store scope data
5. Add error handling

#### Code Changes
```typescript
// File: src/hooks/useOptimizedAuth.ts

const loadAuthData = async (userId: string) => {
  try {
    // ... existing code for loading profile and roles ...
    
    // NEW: Call enhanced RPC for scope data
    const { data: scopeData, error: scopeError } = await supabase.rpc(
      'get_user_auth_data_with_scope',
      { p_user_id: userId }
    );

    if (scopeError) {
      console.error('Error loading scope data:', scopeError);
      // Don't fail completely, just log error
      // User can still use app with limited scope validation
    } else if (scopeData) {
      // Process organizations
      authState.userOrganizations = scopeData.organizations || [];
      
      // Process projects
      authState.userProjects = scopeData.projects || [];
      
      // Process default org
      authState.defaultOrgId = scopeData.default_org || null;
      
      // Process org-specific roles
      authState.orgRoles = new Map();
      if (scopeData.org_roles) {
        Object.entries(scopeData.org_roles).forEach(([orgId, roles]) => {
          authState.orgRoles.set(orgId, roles as RoleSlug[]);
        });
      }
      
      console.log('Scope data loaded:', {
        organizations: authState.userOrganizations.length,
        projects: authState.userProjects.length,
        defaultOrg: authState.defaultOrgId,
        orgRoles: authState.orgRoles.size
      });
    }
    
    // ... rest of existing code ...
  } catch (error) {
    console.error('Error in loadAuthData:', error);
    throw error;
  }
};
```

#### Acceptance Criteria
- [ ] Enhanced RPC call added
- [ ] Scope data processed correctly
- [ ] Error handling implemented
- [ ] Console logging added for debugging
- [ ] No breaking changes to existing flow
- [ ] Function tested with real user

#### Testing
```typescript
// Test in browser console after login
const auth = useOptimizedAuth();
console.log('User organizations:', auth.userOrganizations);
console.log('User projects:', auth.userProjects);
console.log('Default org:', auth.defaultOrgId);
console.log('Org roles:', Array.from(auth.orgRoles.entries()));

// Expected output:
// User organizations: ["org-1-uuid", "org-2-uuid"]
// User projects: ["proj-1-uuid"]
// Default org: "org-1-uuid"
// Org roles: [["org-1-uuid", ["accountant"]], ["org-2-uuid", ["viewer"]]]
```

#### Issues to Watch For
- ⚠️ RPC call fails (function doesn't exist)
- ⚠️ Empty organizations array (user not in org_memberships)
- ⚠️ Null scopeData (RPC returns null)
- ⚠️ Type errors in processing

#### Progress Report Template
```
Task 2.2: [STATUS] - RPC call: [added/failed]. Data processing: [working/errors]. Testing: [passed/failed].
Example: Task 2.2: [COMPLETED] - Enhanced RPC call added. Scope data processing working. Tested with 3 users successfully.
```

---

### TASK-2.3: Add Scope Validation Functions

**Task ID:** `TASK-2.3`  
**Status:** [ ] PENDING  
**Estimated Time:** 1 hour  
**Dependencies:** TASK-2.2 (loadAuthData updated)  
**Assigned To:** AI Agent  

#### Description
Add validation functions to check org membership, project access, and org-scoped permissions.

#### Deliverables
1. ✅ belongsToOrg function
2. ✅ canAccessProject function
3. ✅ getRolesInOrg function
4. ✅ hasActionAccessInOrg function
5. ✅ Functions tested

#### Implementation Steps
1. Open file: `src/hooks/useOptimizedAuth.ts`
2. Add validation functions after loadAuthData
3. Implement each function
4. Add JSDoc comments
5. Test functions

#### Code Changes
```typescript
// File: src/hooks/useOptimizedAuth.ts

// ADD: Scope validation functions

/**
 * Check if user belongs to organization
 * @param orgId - Organization ID to check
 * @returns true if user is member of organization
 */
const belongsToOrg = (orgId: string): boolean => {
  if (!orgId) return false;
  return authState.userOrganizations.includes(orgId);
};

/**
 * Check if user can access project
 * @param projectId - Project ID to check
 * @returns true if user has access to project
 */
const canAccessProject = (projectId: string): boolean => {
  if (!projectId) return false;
  return authState.userProjects.includes(projectId);
};

/**
 * Get user's roles in specific organization
 * @param orgId - Organization ID
 * @returns Array of role slugs in that organization
 */
const getRolesInOrg = (orgId: string): RoleSlug[] => {
  if (!orgId) return [];
  return authState.orgRoles.get(orgId) || [];
};

/**
 * Check if user has permission in specific organization
 * @param action - Permission code to check
 * @param orgId - Organization ID
 * @returns true if user has permission in that organization
 */
const hasActionAccessInOrg = (
  action: PermissionCode,
  orgId: string
): boolean => {
  // Check if user belongs to org
  if (!belongsToOrg(orgId)) {
    console.warn(`User does not belong to org: ${orgId}`);
    return false;
  }
  
  // Get org-specific roles
  const orgRoles = getRolesInOrg(orgId);
  if (orgRoles.length === 0) {
    console.warn(`User has no roles in org: ${orgId}`);
    return false;
  }
  
  // Check if any org role has this permission
  const orgPermissions = flattenPermissions(orgRoles);
  const hasPermission = orgPermissions.actions.has(action);
  
  console.log(`Permission check: ${action} in ${orgId}:`, hasPermission);
  return hasPermission;
};
```

#### Acceptance Criteria
- [ ] All 4 functions implemented
- [ ] Functions have correct type signatures
- [ ] JSDoc comments added
- [ ] Error handling implemented
- [ ] Console logging for debugging
- [ ] Functions tested with real data

#### Testing
```typescript
// Test in browser console
const auth = useOptimizedAuth();

// Test belongsToOrg
console.log('Belongs to org-1:', auth.belongsToOrg('org-1-uuid'));
// Expected: true (if user is member)

console.log('Belongs to other-org:', auth.belongsToOrg('other-org-uuid'));
// Expected: false (if user is not member)

// Test canAccessProject
console.log('Can access proj-1:', auth.canAccessProject('proj-1-uuid'));
// Expected: true (if user has access)

// Test getRolesInOrg
console.log('Roles in org-1:', auth.getRolesInOrg('org-1-uuid'));
// Expected: ['accountant'] or similar

// Test hasActionAccessInOrg
console.log('Can create transactions in org-1:', 
  auth.hasActionAccessInOrg('transactions.create', 'org-1-uuid'));
// Expected: true (if accountant has permission)

console.log('Can manage users in org-1:', 
  auth.hasActionAccessInOrg('users.manage', 'org-1-uuid'));
// Expected: false (if accountant doesn't have permission)
```

#### Issues to Watch For
- ⚠️ Functions return incorrect results
- ⚠️ Type errors
- ⚠️ Null/undefined handling issues
- ⚠️ Performance issues with large org lists

#### Progress Report Template
```
Task 2.3: [STATUS] - Functions: [4/4 implemented]. Testing: [passed/failed]. Issues: [none/list].
Example: Task 2.3: [COMPLETED] - All 4 validation functions implemented. Tested with 5 scenarios. All tests passed.
```

---

### TASK-2.4: Export New Functions

**Task ID:** `TASK-2.4`  
**Status:** [ ] PENDING  
**Estimated Time:** 15 minutes  
**Dependencies:** TASK-2.3 (functions added)  
**Assigned To:** AI Agent  

#### Description
Export new scope validation functions from useOptimizedAuth hook.

#### Deliverables
1. ✅ Functions exported from hook
2. ✅ Return type updated
3. ✅ TypeScript compilation verified
4. ✅ Exports tested

#### Implementation Steps
1. Open file: `src/hooks/useOptimizedAuth.ts`
2. Find return statement
3. Add new exports
4. Verify TypeScript compilation

#### Code Changes
```typescript
// File: src/hooks/useOptimizedAuth.ts

// UPDATE: Return statement
return {
  // Existing exports
  user,
  profile,
  loading,
  roles,
  resolvedPermissions,
  hasRouteAccess,
  hasActionAccess,
  signIn,
  signOut,
  refreshAuth,
  
  // NEW: Scope-aware exports
  userOrganizations: authState.userOrganizations,
  userProjects: authState.userProjects,
  defaultOrgId: authState.defaultOrgId,
  belongsToOrg,
  canAccessProject,
  getRolesInOrg,
  hasActionAccessInOrg,
} as const;
```

#### Acceptance Criteria
- [ ] All new functions exported
- [ ] Return type matches interface
- [ ] TypeScript compiles without errors
- [ ] No breaking changes
- [ ] Exports accessible in components

#### Verification
```typescript
// Test in a component
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

function TestComponent() {
  const { 
    userOrganizations,
    userProjects,
    defaultOrgId,
    belongsToOrg,
    canAccessProject,
    getRolesInOrg,
    hasActionAccessInOrg
  } = useOptimizedAuth();
  
  // All exports should be available
  console.log('Exports available:', {
    userOrganizations,
    userProjects,
    defaultOrgId,
    belongsToOrg: typeof belongsToOrg,
    canAccessProject: typeof canAccessProject,
    getRolesInOrg: typeof getRolesInOrg,
    hasActionAccessInOrg: typeof hasActionAccessInOrg
  });
  
  return null;
}
```

#### Progress Report Template
```
Task 2.4: [STATUS] - Exports: [added/failed]. TypeScript: [compiled/errors]. Testing: [passed/failed].
Example: Task 2.4: [COMPLETED] - All 7 new exports added. TypeScript compiles. Exports accessible in components.
```

---

### TASK-2.5: Test Auth Hook Changes

**Task ID:** `TASK-2.5`  
**Status:** [ ] PENDING  
**Estimated Time:** 1 hour  
**Dependencies:** TASK-2.4 (exports added)  
**Assigned To:** AI Agent  

#### Description
Comprehensive testing of updated useOptimizedAuth hook with real user data.

#### Deliverables
1. ✅ Test results for all new functions
2. ✅ Integration test with real users
3. ✅ Performance test
4. ✅ Test report document

#### Implementation Steps
1. Create test component
2. Test with different user types
3. Verify all functions work correctly
4. Check performance
5. Document results

#### Test Cases

**Test Case 1: Accountant User**
```typescript
// Login as accountant (belongs to org-1 only)
const auth = useOptimizedAuth();

// Should have organizations
expect(auth.userOrganizations.length).toBeGreaterThan(0);

// Should belong to org-1
expect(auth.belongsToOrg('org-1-uuid')).toBe(true);

// Should NOT belong to org-2
expect(auth.belongsToOrg('org-2-uuid')).toBe(false);

// Should have roles in org-1
expect(auth.getRolesInOrg('org-1-uuid')).toContain('accountant');

// Should have permissions in org-1
expect(auth.hasActionAccessInOrg('transactions.create', 'org-1-uuid')).toBe(true);

// Should NOT have admin permissions
expect(auth.hasActionAccessInOrg('users.manage', 'org-1-uuid')).toBe(false);
```

**Test Case 2: Admin User**
```typescript
// Login as admin (belongs to multiple orgs)
const auth = useOptimizedAuth();

// Should have multiple organizations
expect(auth.userOrganizations.length).toBeGreaterThan(1);

// Should have admin role in org-1
expect(auth.getRolesInOrg('org-1-uuid')).toContain('admin');

// Should have admin permissions
expect(auth.hasActionAccessInOrg('users.manage', 'org-1-uuid')).toBe(true);
```

**Test Case 3: Super Admin User**
```typescript
// Login as super_admin
const auth = useOptimizedAuth();

// May have empty organizations (global role)
// Super admin should be handled specially in route protection
```

**Test Case 4: Performance**
```typescript
// Measure function execution time
const start = performance.now();
for (let i = 0; i < 1000; i++) {
  auth.belongsToOrg('org-1-uuid');
}
const end = performance.now();
const avgTime = (end - start) / 1000;

// Should be < 1ms per call
expect(avgTime).toBeLessThan(1);
```

#### Acceptance Criteria
- [ ] All test cases pass
- [ ] Functions return correct results
- [ ] Performance is acceptable (< 1ms per call)
- [ ] No console errors
- [ ] Works with different user types
- [ ] Edge cases handled (null, undefined, empty arrays)

#### Test Report Template
```
Test Results:
- Accountant user: [PASS/FAIL] - [details]
- Admin user: [PASS/FAIL] - [details]
- Super admin user: [PASS/FAIL] - [details]
- Performance: [PASS/FAIL] - [X ms per call]
- Edge cases: [PASS/FAIL] - [details]
- Overall: [PASS/FAIL]
```

#### Issues to Watch For
- ⚠️ Functions return incorrect results
- ⚠️ Performance issues
- ⚠️ Null/undefined errors
- ⚠️ Type errors
- ⚠️ Memory leaks

#### Progress Report Template
```
Task 2.5: [STATUS] - Tests: [X/Y passed]. Performance: [acceptable/slow]. Issues: [none/list].
Example: Task 2.5: [COMPLETED] - All 5 test cases passed. Performance < 1ms. No issues found.
```

---

## ✅ PHASE 2 COMPLETION CHECKLIST

### All Tasks Complete
- [ ] TASK-2.1: Interface updated
- [ ] TASK-2.2: loadAuthData updated
- [ ] TASK-2.3: Validation functions added
- [ ] TASK-2.4: Functions exported
- [ ] TASK-2.5: Hook tested

### Verification
- [ ] TypeScript compiles without errors
- [ ] All new functions work correctly
- [ ] Performance is acceptable
- [ ] No breaking changes
- [ ] Works with different user types

### Documentation
- [ ] Progress report completed for all tasks
- [ ] Test results documented
- [ ] Any issues documented
- [ ] Code comments added

### Sign-Off
```
Phase 2 Completion Report:
- Completed: [Date/Time]
- All tasks: [COMPLETED/BLOCKED]
- TypeScript: [compiled/errors]
- Tests: [X/Y passed]
- Performance: [acceptable/needs optimization]
- Issues found: [None/List issues]
- Ready for Phase 3: [YES/NO]
- Notes: [Any additional notes]
```

---

## 🔒 PHASE 3: SCOPECONTEXT VALIDATION (2 days)

**Goal:** Add validation to ScopeContext to prevent unauthorized org/project selection  
**Priority:** HIGH  
**Risk Level:** Low  

---

### TASK-3.1: Update setOrganization Function

**Task ID:** `TASK-3.1`  
**Status:** [ ] PENDING  
**Estimated Time:** 1 hour  
**Dependencies:** Phase 2 complete  
**Assigned To:** AI Agent  

#### Description
Add validation to setOrganization function to check if user belongs to organization before allowing selection.

#### Deliverables
1. ✅ Validation logic added
2. ✅ Error handling implemented
3. ✅ User feedback added
4. ✅ Function tested

#### Implementation Steps
1. Open file: `src/contexts/ScopeContext.tsx`
2. Find setOrganization function
3. Add validation before setting org
4. Add error handling
5. Test with valid and invalid orgs

#### Code Changes
```typescript
// File: src/contexts/ScopeContext.tsx

const setOrganization = async (orgId: string | null) => {
  try {
    if (orgId) {
      // NEW: Validate user belongs to this org
      if (!belongsToOrg(orgId)) {
        const error = new Error('You do not have access to this organization');
        console.error('Org access denied:', { orgId, userOrgs: userOrganizations });
        
        // Show user-friendly error message
        toast.error('Access Denied: You do not have permission to access this organization');
        
        throw error;
      }
      
      // Load org details
      const { data: org, error: loadError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
      
      if (loadError) {
        console.error('Failed to load organization:', loadError);
        toast.error(`Failed to load organization: ${loadError.message}`);
        throw new Error(`Failed to load organization: ${loadError.message}`);
      }
      
      // Set organization
      setCurrentOrg(org);
      
      // Save to localStorage for persistence
      localStorage.setItem('selectedOrgId', orgId);
      
      console.log('Organization selected:', org.name);
      toast.success(`Switched to ${org.name}`);
    } else {
      setCurrentOrg(null);
      localStorage.removeItem('selectedOrgId');
    }
    
    // Clear project when org changes
    setCurrentProject(null);
    localStorage.removeItem('selectedProjectId');
    
  } catch (error) {
    console.error('Error in setOrganization:', error);
    throw error;
  }
};
```

#### Acceptance Criteria
- [ ] Validation checks user belongs to org
- [ ] Error thrown if user doesn't belong
- [ ] User-friendly error message shown
- [ ] Org details loaded from database
- [ ] Project cleared when org changes
- [ ] Selection persisted to localStorage
- [ ] Function tested with valid and invalid orgs

#### Testing
```typescript
// Test Case 1: Valid org
await setOrganization('org-1-uuid');
// Expected: Success, org selected

// Test Case 2: Invalid org
await expect(setOrganization('other-org-uuid'))
  .rejects.toThrow('You do not have access to this organization');
// Expected: Error thrown, toast shown

// Test Case 3: Null org
await setOrganization(null);
// Expected: Org cleared
```

#### Progress Report Template
```
Task 3.1: [STATUS] - Validation: [added/failed]. Testing: [passed/failed]. Issues: [none/list].
Example: Task 3.1: [COMPLETED] - Validation added. Tested with 3 scenarios. All tests passed.
```

---

### TASK-3.2: Update setProject Function

**Task ID:** `TASK-3.2`  
**Status:** [ ] PENDING  
**Estimated Time:** 1 hour  
**Dependencies:** TASK-3.1 (setOrganization updated)  
**Assigned To:** AI Agent  

#### Description
Add validation to setProject function to check if user can access project and if project belongs to current org.

#### Deliverables
1. ✅ Project access validation
2. ✅ Org membership validation
3. ✅ Error handling
4. ✅ Function tested

#### Implementation Steps
1. Open file: `src/contexts/ScopeContext.tsx`
2. Find setProject function
3. Add validation logic
4. Test with valid and invalid projects

#### Code Changes
```typescript
// File: src/contexts/ScopeContext.tsx

const setProject = async (projectId: string | null) => {
  try {
    if (projectId) {
      // NEW: Validate user can access this project
      if (!canAccessProject(projectId)) {
        const error = new Error('You do not have access to this project');
        console.error('Project access denied:', { projectId, userProjects });
        
        toast.error('Access Denied: You do not have permission to access this project');
        
        throw error;
      }
      
      // Load project details
      const { data: project, error: loadError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (loadError) {
        console.error('Failed to load project:', loadError);
        toast.error(`Failed to load project: ${loadError.message}`);
        throw new Error(`Failed to load project: ${loadError.message}`);
      }
      
      // NEW: Validate project belongs to current org
      if (currentOrg && project.organization_id !== currentOrg.id) {
        const error = new Error('Project does not belong to current organization');
        console.error('Project org mismatch:', {
          projectOrg: project.organization_id,
          currentOrg: currentOrg.id
        });
        
        toast.error('This project does not belong to the current organization');
        
        throw error;
      }
      
      // Set project
      setCurrentProject(project);
      
      // Save to localStorage
      localStorage.setItem('selectedProjectId', projectId);
      
      console.log('Project selected:', project.name);
      toast.success(`Switched to ${project.name}`);
    } else {
      setCurrentProject(null);
      localStorage.removeItem('selectedProjectId');
    }
    
  } catch (error) {
    console.error('Error in setProject:', error);
    throw error;
  }
};
```

#### Acceptance Criteria
- [ ] Validates user can access project
- [ ] Validates project belongs to current org
- [ ] Error thrown for unauthorized access
- [ ] User-friendly error messages
- [ ] Project details loaded from database
- [ ] Selection persisted to localStorage
- [ ] Function tested

#### Testing
```typescript
// Test Case 1: Valid project
await setProject('proj-1-uuid');
// Expected: Success, project selected

// Test Case 2: Unauthorized project
await expect(setProject('other-proj-uuid'))
  .rejects.toThrow('You do not have access to this project');
// Expected: Error thrown

// Test Case 3: Project from different org
await setOrganization('org-1-uuid');
await expect(setProject('org-2-proj-uuid'))
  .rejects.toThrow('Project does not belong to current organization');
// Expected: Error thrown

// Test Case 4: Null project
await setProject(null);
// Expected: Project cleared
```

#### Progress Report Template
```
Task 3.2: [STATUS] - Validation: [added/failed]. Testing: [passed/failed]. Issues: [none/list].
Example: Task 3.2: [COMPLETED] - Project validation added. Tested with 4 scenarios. All tests passed.
```

---

### TASK-3.3: Add Error Handling

**Task ID:** `TASK-3.3`  
**Status:** [ ] PENDING  
**Estimated Time:** 30 minutes  
**Dependencies:** TASK-3.2 (setProject updated)  
**Assigned To:** AI Agent  

#### Description
Add comprehensive error handling and user feedback for scope validation errors.

#### Deliverables
1. ✅ Error boundary added
2. ✅ User-friendly error messages
3. ✅ Error logging
4. ✅ Recovery mechanisms

#### Implementation Steps
1. Add error boundary to ScopeProvider
2. Improve error messages
3. Add error logging
4. Test error scenarios

#### Code Changes
```typescript
// File: src/contexts/ScopeContext.tsx

// ADD: Error state
const [scopeError, setScopeError] = useState<Error | null>(null);

// ADD: Error recovery function
const clearScopeError = () => {
  setScopeError(null);
};

// UPDATE: Wrap provider with error handling
return (
  <ScopeContext.Provider value={{
    currentOrg,
    currentProject,
    availableOrgs,
    availableProjects,
    setOrganization: async (orgId) => {
      try {
        setScopeError(null);
        await setOrganization(orgId);
      } catch (error) {
        setScopeError(error as Error);
        throw error;
      }
    },
    setProject: async (projectId) => {
      try {
        setScopeError(null);
        await setProject(projectId);
      } catch (error) {
        setScopeError(error as Error);
        throw error;
      }
    },
    scopeError,
    clearScopeError,
  }}>
    {children}
  </ScopeContext.Provider>
);
```

#### Acceptance Criteria
- [ ] Error state added to context
- [ ] Error recovery function added
- [ ] Errors caught and stored
- [ ] User-friendly error messages
- [ ] Error logging implemented
- [ ] Tested with various error scenarios

#### Progress Report Template
```
Task 3.3: [STATUS] - Error handling: [added/failed]. Testing: [passed/failed].
Example: Task 3.3: [COMPLETED] - Error handling added. Tested with 5 error scenarios. All handled correctly.
```

---

### TASK-3.4: Test ScopeContext Changes

**Task ID:** `TASK-3.4`  
**Status:** [ ] PENDING  
**Estimated Time:** 1 hour  
**Dependencies:** TASK-3.3 (error handling added)  
**Assigned To:** AI Agent  

#### Description
Comprehensive testing of ScopeContext validation with real user data.

#### Deliverables
1. ✅ Test results for all scenarios
2. ✅ Integration test
3. ✅ Error handling test
4. ✅ Test report

#### Test Cases

**Test Case 1: Valid Org Selection**
```typescript
const { setOrganization } = useScope();
await setOrganization('org-1-uuid');
// Expected: Success, org selected, no errors
```

**Test Case 2: Invalid Org Selection**
```typescript
const { setOrganization } = useScope();
await expect(setOrganization('other-org-uuid'))
  .rejects.toThrow('You do not have access to this organization');
// Expected: Error thrown, toast shown, org not changed
```

**Test Case 3: Valid Project Selection**
```typescript
const { setOrganization, setProject } = useScope();
await setOrganization('org-1-uuid');
await setProject('proj-1-uuid');
// Expected: Success, project selected
```

**Test Case 4: Project from Different Org**
```typescript
const { setOrganization, setProject } = useScope();
await setOrganization('org-1-uuid');
await expect(setProject('org-2-proj-uuid'))
  .rejects.toThrow('Project does not belong to current organization');
// Expected: Error thrown, project not changed
```

**Test Case 5: Org Change Clears Project**
```typescript
const { setOrganization, setProject, currentProject } = useScope();
await setOrganization('org-1-uuid');
await setProject('proj-1-uuid');
expect(currentProject).not.toBeNull();

await setOrganization('org-2-uuid');
expect(currentProject).toBeNull();
// Expected: Project cleared when org changes
```

#### Acceptance Criteria
- [ ] All test cases pass
- [ ] Validation works correctly
- [ ] Error handling works
- [ ] User feedback is clear
- [ ] No console errors
- [ ] Performance is acceptable

#### Progress Report Template
```
Task 3.4: [STATUS] - Tests: [X/Y passed]. Issues: [none/list].
Example: Task 3.4: [COMPLETED] - All 5 test cases passed. No issues found.
```

---

## ✅ PHASE 3 COMPLETION CHECKLIST

### All Tasks Complete
- [ ] TASK-3.1: setOrganization updated
- [ ] TASK-3.2: setProject updated
- [ ] TASK-3.3: Error handling added
- [ ] TASK-3.4: ScopeContext tested

### Verification
- [ ] Org selection validates membership
- [ ] Project selection validates access
- [ ] Error messages are user-friendly
- [ ] No unauthorized access possible
- [ ] Performance is acceptable

### Documentation
- [ ] Progress report completed
- [ ] Test results documented
- [ ] Any issues documented

### Sign-Off
```
Phase 3 Completion Report:
- Completed: [Date/Time]
- All tasks: [COMPLETED/BLOCKED]
- Tests: [X/Y passed]
- Issues found: [None/List issues]
- Ready for Phase 4: [YES/NO]
- Notes: [Any additional notes]
```

---

## 🛡️ PHASE 4: ROUTE PROTECTION (2 days)

**Goal:** Add scope validation to route protection to prevent unauthorized access via URL manipulation  
**Priority:** HIGH  
**Risk Level:** Low  

---

### TASK-4.1: Update OptimizedProtectedRoute Props

**Task ID:** `TASK-4.1`  
**Status:** [ ] PENDING  
**Estimated Time:** 30 minutes  
**Dependencies:** Phase 3 complete  
**Assigned To:** AI Agent  

#### Description
Update OptimizedProtectedRoute component props to support org and project access requirements.

#### Deliverables
1. ✅ Props interface updated
2. ✅ TypeScript types added
3. ✅ Component compiles
4. ✅ Documentation added

#### Implementation Steps
1. Open file: `src/components/routing/OptimizedProtectedRoute.tsx`
2. Update props interface
3. Add JSDoc comments
4. Verify TypeScript compilation

#### Code Changes
```typescript
// File: src/components/routing/OptimizedProtectedRoute.tsx

interface OptimizedProtectedRouteProps {
  children: React.ReactNode;
  requiredAction?: PermissionCode;
  
  // NEW: Scope requirements
  requiresOrgAccess?: boolean;      // Requires user to belong to current org
  requiresProjectAccess?: boolean;  // Requires user to have access to current project
  
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Protected route component with permission and scope validation
 * 
 * @param requiredAction - Permission code required to access route
 * @param requiresOrgAccess - If true, validates user belongs to current org
 * @param requiresProjectAccess - If true, validates user can access current project
 * @param fallback - Component to show while loading
 * @param redirectTo - Path to redirect if access denied
 */
export function OptimizedProtectedRoute({
  children,
  requiredAction,
  requiresOrgAccess = false,
  requiresProjectAccess = false,
  fallback,
  redirectTo = '/unauthorized'
}: OptimizedProtectedRouteProps) {
  // ... implementation
}
```

#### Acceptance Criteria
- [ ] Props interface updated
- [ ] New props have default values
- [ ] JSDoc comments added
- [ ] TypeScript compiles
- [ ] No breaking changes

#### Progress Report Template
```
Task 4.1: [STATUS] - Props updated. TypeScript: [compiled/errors].
Example: Task 4.1: [COMPLETED] - Added 2 new props. TypeScript compiles. No breaking changes.
```

---

### TASK-4.2: Add Org Access Validation

**Task ID:** `TASK-4.2`  
**Status:** [ ] PENDING  
**Estimated Time:** 1 hour  
**Dependencies:** TASK-4.1 (props updated)  
**Assigned To:** AI Agent  

#### Description
Add validation logic to check if user belongs to current organization before allowing route access.

#### Deliverables
1. ✅ Org access validation logic
2. ✅ Redirect for unauthorized access
3. ✅ Error state handling
4. ✅ Function tested

#### Implementation Steps
1. Import useOptimizedAuth and useScope
2. Add org access validation
3. Add redirect logic
4. Test with valid and invalid access

#### Code Changes
```typescript
// File: src/components/routing/OptimizedProtectedRoute.tsx

export function OptimizedProtectedRoute({
  children,
  requiredAction,
  requiresOrgAccess = false,
  requiresProjectAccess = false,
  fallback,
  redirectTo = '/unauthorized'
}: OptimizedProtectedRouteProps) {
  const location = useLocation();
  const { belongsToOrg, canAccessProject, loading } = useOptimizedAuth();
  const { currentOrg, currentProject } = useScope();
  
  // Show loading state
  if (loading) {
    return fallback || <div>Loading...</div>;
  }
  
  // NEW: Validate org access if required
  if (requiresOrgAccess) {
    // Check if org is selected
    if (!currentOrg) {
      console.warn('Route requires org access but no org selected');
      return (
        <Navigate 
          to="/select-organization" 
          state={{ 
            from: location,
            reason: 'org_required'
          }} 
          replace 
        />
      );
    }
    
    // Check if user belongs to selected org
    if (!belongsToOrg(currentOrg.id)) {
      console.error('User does not belong to selected org:', currentOrg.id);
      return (
        <Navigate 
          to={redirectTo} 
          state={{ 
            from: location,
            reason: 'org_access_denied',
            orgId: currentOrg.id,
            orgName: currentOrg.name
          }} 
          replace 
        />
      );
    }
  }
  
  // ... rest of existing validation (permissions, etc.)
  
  return <>{children}</>;
}
```

#### Acceptance Criteria
- [ ] Org access validation added
- [ ] Redirects to /select-organization if no org selected
- [ ] Redirects to /unauthorized if user doesn't belong to org
- [ ] State passed to redirect includes reason and context
- [ ] Console logging for debugging
- [ ] Tested with valid and invalid access

#### Testing
```typescript
// Test Case 1: No org selected
// Navigate to route with requiresOrgAccess=true
// Expected: Redirect to /select-organization

// Test Case 2: User belongs to org
// Select org-1, navigate to route
// Expected: Access granted

// Test Case 3: User doesn't belong to org
// Manually set currentOrg to org-2 (user doesn't belong)
// Expected: Redirect to /unauthorized
```

#### Progress Report Template
```
Task 4.2: [STATUS] - Validation: [added/failed]. Testing: [passed/failed].
Example: Task 4.2: [COMPLETED] - Org access validation added. Tested with 3 scenarios. All tests passed.
```

---

### TASK-4.3: Add Route Param Validation

**Task ID:** `TASK-4.3`  
**Status:** [ ] PENDING  
**Estimated Time:** 1 hour  
**Dependencies:** TASK-4.2 (org validation added)  
**Assigned To:** AI Agent  

#### Description
Add validation to check route parameters (orgId, projectId) match user's scope.

#### Deliverables
1. ✅ Route param extraction
2. ✅ Param validation logic
3. ✅ Redirect for mismatched params
4. ✅ Function tested

#### Implementation Steps
1. Import useParams
2. Extract org/project IDs from route
3. Validate against user's scope
4. Test with various route patterns

#### Code Changes
```typescript
// File: src/components/routing/OptimizedProtectedRoute.tsx

export function OptimizedProtectedRoute({
  children,
  requiredAction,
  requiresOrgAccess = false,
  requiresProjectAccess = false,
  fallback,
  redirectTo = '/unauthorized'
}: OptimizedProtectedRouteProps) {
  const location = useLocation();
  const params = useParams();
  const { belongsToOrg, canAccessProject, loading } = useOptimizedAuth();
  const { currentOrg, currentProject } = useScope();
  
  // ... existing loading and org access validation ...
  
  // NEW: Validate route params match user's scope
  const routeOrgId = params.orgId || params.organizationId;
  if (routeOrgId) {
    // Check if user belongs to org in route
    if (!belongsToOrg(routeOrgId)) {
      console.error('User does not belong to org in route:', routeOrgId);
      return (
        <Navigate 
          to={redirectTo} 
          state={{ 
            from: location,
            reason: 'org_access_denied',
            orgId: routeOrgId,
            message: 'You do not have access to this organization'
          }} 
          replace 
        />
      );
    }
    
    // If org in route doesn't match current org, update current org
    if (currentOrg && currentOrg.id !== routeOrgId) {
      console.warn('Route org mismatch, updating current org:', routeOrgId);
      // This will trigger a re-render with correct org
      setOrganization(routeOrgId);
    }
  }
  
  // NEW: Validate project param
  const routeProjectId = params.projectId;
  if (routeProjectId) {
    // Check if user can access project in route
    if (!canAccessProject(routeProjectId)) {
      console.error('User cannot access project in route:', routeProjectId);
      return (
        <Navigate 
          to={redirectTo} 
          state={{ 
            from: location,
            reason: 'project_access_denied',
            projectId: routeProjectId,
            message: 'You do not have access to this project'
          }} 
          replace 
        />
      );
    }
  }
  
  // ... rest of existing validation ...
  
  return <>{children}</>;
}
```

#### Acceptance Criteria
- [ ] Route params extracted correctly
- [ ] Org ID validated against user's scope
- [ ] Project ID validated against user's scope
- [ ] Redirects for unauthorized params
- [ ] Current org updated if route param differs
- [ ] Tested with various route patterns

#### Testing
```typescript
// Test Case 1: Valid org in route
// Navigate to /organizations/org-1-uuid/settings
// Expected: Access granted

// Test Case 2: Invalid org in route
// Navigate to /organizations/other-org-uuid/settings
// Expected: Redirect to /unauthorized

// Test Case 3: Valid project in route
// Navigate to /projects/proj-1-uuid/details
// Expected: Access granted

// Test Case 4: Invalid project in route
// Navigate to /projects/other-proj-uuid/details
// Expected: Redirect to /unauthorized
```

#### Progress Report Template
```
Task 4.3: [STATUS] - Param validation: [added/failed]. Testing: [passed/failed].
Example: Task 4.3: [COMPLETED] - Route param validation added. Tested with 4 scenarios. All tests passed.
```

---

### TASK-4.4: Update Route Definitions

**Task ID:** `TASK-4.4`  
**Status:** [ ] PENDING  
**Estimated Time:** 1 hour  
**Dependencies:** TASK-4.3 (param validation added)  
**Assigned To:** AI Agent  

#### Description
Update route definitions to use new requiresOrgAccess and requiresProjectAccess props.

#### Deliverables
1. ✅ Route definitions updated
2. ✅ Org-scoped routes protected
3. ✅ Project-scoped routes protected
4. ✅ Routes tested

#### Implementation Steps
1. Find all route definitions
2. Add requiresOrgAccess where needed
3. Add requiresProjectAccess where needed
4. Test each route

#### Code Changes
```typescript
// Example: src/routes/SettingsRoutes.tsx

<Route path="organization-management" element={
  <OptimizedProtectedRoute 
    requiredAction="settings.manage"
    requiresOrgAccess={true}  // NEW: Requires org access
  >
    <OrganizationManagement />
  </OptimizedProtectedRoute>
} />

<Route path="organizations/:orgId/settings" element={
  <OptimizedProtectedRoute 
    requiredAction="settings.manage"
    requiresOrgAccess={true}  // NEW: Validates orgId param
  >
    <OrganizationSettings />
  </OptimizedProtectedRoute>
} />

<Route path="projects/:projectId/details" element={
  <OptimizedProtectedRoute 
    requiredAction="projects.view"
    requiresProjectAccess={true}  // NEW: Validates projectId param
  >
    <ProjectDetails />
  </OptimizedProtectedRoute>
} />

// Example: src/routes/TransactionRoutes.tsx

<Route path="transactions" element={
  <OptimizedProtectedRoute 
    requiredAction="transactions.view"
    requiresOrgAccess={true}  // NEW: Transactions are org-scoped
  >
    <Transactions />
  </OptimizedProtectedRoute>
} />
```

#### Routes to Update
- [ ] Organization management routes
- [ ] Project management routes
- [ ] Transaction routes
- [ ] Report routes
- [ ] Settings routes
- [ ] Any other org-scoped routes

#### Acceptance Criteria
- [ ] All org-scoped routes have requiresOrgAccess=true
- [ ] All project-scoped routes have requiresProjectAccess=true
- [ ] Routes with :orgId param are protected
- [ ] Routes with :projectId param are protected
- [ ] No breaking changes
- [ ] All routes tested

#### Progress Report Template
```
Task 4.4: [STATUS] - Updated X routes. Testing: [passed/failed].
Example: Task 4.4: [COMPLETED] - Updated 15 routes. All routes tested and working correctly.
```

---

### TASK-4.5: Test Route Protection

**Task ID:** `TASK-4.5`  
**Status:** [ ] PENDING  
**Estimated Time:** 1 hour  
**Dependencies:** TASK-4.4 (routes updated)  
**Assigned To:** AI Agent  

#### Description
Comprehensive testing of route protection with various access scenarios.

#### Deliverables
1. ✅ Test results for all scenarios
2. ✅ URL manipulation test
3. ✅ Integration test
4. ✅ Test report

#### Test Cases

**Test Case 1: Authorized Access**
```typescript
// Login as accountant (belongs to org-1)
// Navigate to /organizations/org-1-uuid/settings
// Expected: Access granted, page loads
```

**Test Case 2: Unauthorized Org Access**
```typescript
// Login as accountant (belongs to org-1 only)
// Navigate to /organizations/org-2-uuid/settings
// Expected: Redirect to /unauthorized
```

**Test Case 3: URL Manipulation**
```typescript
// Login as accountant
// Manually change URL to /organizations/other-org-uuid/transactions
// Expected: Redirect to /unauthorized, cannot access
```

**Test Case 4: No Org Selected**
```typescript
// Login but don't select org
// Navigate to /transactions (requires org)
// Expected: Redirect to /select-organization
```

**Test Case 5: Project Access**
```typescript
// Login as accountant
// Navigate to /projects/proj-1-uuid/details (user has access)
// Expected: Access granted

// Navigate to /projects/other-proj-uuid/details (user doesn't have access)
// Expected: Redirect to /unauthorized
```

#### Acceptance Criteria
- [ ] All test cases pass
- [ ] URL manipulation blocked
- [ ] Unauthorized access prevented
- [ ] Appropriate redirects occur
- [ ] Error messages are clear
- [ ] No console errors

#### Progress Report Template
```
Task 4.5: [STATUS] - Tests: [X/Y passed]. Issues: [none/list].
Example: Task 4.5: [COMPLETED] - All 5 test cases passed. URL manipulation blocked. No issues found.
```

---

## ✅ PHASE 4 COMPLETION CHECKLIST

### All Tasks Complete
- [ ] TASK-4.1: Props updated
- [ ] TASK-4.2: Org validation added
- [ ] TASK-4.3: Param validation added
- [ ] TASK-4.4: Routes updated
- [ ] TASK-4.5: Protection tested

### Verification
- [ ] Route protection validates scope
- [ ] URL manipulation blocked
- [ ] Unauthorized access prevented
- [ ] Redirects work correctly
- [ ] Error messages are clear

### Documentation
- [ ] Progress report completed
- [ ] Test results documented
- [ ] Any issues documented

### Sign-Off
```
Phase 4 Completion Report:
- Completed: [Date/Time]
- All tasks: [COMPLETED/BLOCKED]
- Routes updated: [X routes]
- Tests: [X/Y passed]
- Issues found: [None/List issues]
- Ready for Phase 5: [YES/NO]
- Notes: [Any additional notes]
```

---

## 🧪 PHASE 5: TESTING & DEPLOYMENT (2 days)

**Goal:** Comprehensive testing and production deployment  
**Priority:** CRITICAL  
**Risk Level:** Medium (production deployment)  

---

### TASK-5.1: Run Unit Tests

**Task ID:** `TASK-5.1`  
**Status:** [ ] PENDING  
**Estimated Time:** 1 hour  
**Dependencies:** Phase 4 complete  
**Assigned To:** AI Agent  

#### Description
Run all unit tests to verify individual components work correctly.

#### Deliverables
1. ✅ Unit test results
2. ✅ Code coverage report
3. ✅ Failed tests fixed
4. ✅ Test report document

#### Implementation Steps
1. Run unit test suite
2. Review test results
3. Fix any failing tests
4. Generate coverage report
5. Document results

#### Test Commands
```bash
# Run all unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test src/hooks/useOptimizedAuth.test.ts

# Run tests in watch mode
npm run test:watch
```

#### Tests to Run
- [ ] useOptimizedAuth hook tests
- [ ] ScopeContext tests
- [ ] OptimizedProtectedRoute tests
- [ ] Validation function tests
- [ ] Helper function tests

#### Acceptance Criteria
- [ ] All unit tests pass
- [ ] Code coverage > 80%
- [ ] No failing tests
- [ ] No console errors
- [ ] Test report generated

#### Progress Report Template
```
Task 5.1: [STATUS] - Tests: [X/Y passed]. Coverage: [X%]. Failed: [Y tests].
Example: Task 5.1: [COMPLETED] - All 45 unit tests passed. Coverage: 87%. No failures.
```

---

### TASK-5.2: Run Integration Tests

**Task ID:** `TASK-5.2`  
**Status:** [ ] PENDING  
**Estimated Time:** 1 hour  
**Dependencies:** TASK-5.1 (unit tests passed)  
**Assigned To:** AI Agent  

#### Description
Run integration tests to verify components work together correctly.

#### Deliverables
1. ✅ Integration test results
2. ✅ End-to-end flow verification
3. ✅ Failed tests fixed
4. ✅ Test report

#### Test Scenarios

**Scenario 1: Complete Auth Flow**
```typescript
// 1. User logs in
await signIn('accountant@example.com', 'password');

// 2. Auth data loads (including scope)
expect(userOrganizations).toHaveLength(2);
expect(defaultOrgId).toBe('org-1-uuid');

// 3. User selects organization
await setOrganization('org-1-uuid');
expect(currentOrg.id).toBe('org-1-uuid');

// 4. User navigates to transactions
navigate('/transactions');
expect(location.pathname).toBe('/transactions');

// 5. User tries to access unauthorized org
await expect(setOrganization('org-2-uuid'))
  .rejects.toThrow('You do not have access');
```

**Scenario 2: URL Manipulation Prevention**
```typescript
// 1. User logs in as accountant
await signIn('accountant@example.com', 'password');

// 2. User tries to access unauthorized org via URL
navigate('/organizations/other-org-uuid/settings');

// 3. Should redirect to unauthorized
expect(location.pathname).toBe('/unauthorized');
expect(location.state.reason).toBe('org_access_denied');
```

**Scenario 3: Org Change Clears Project**
```typescript
// 1. Select org and project
await setOrganization('org-1-uuid');
await setProject('proj-1-uuid');
expect(currentProject).not.toBeNull();

// 2. Change organization
await setOrganization('org-2-uuid');

// 3. Project should be cleared
expect(currentProject).toBeNull();
```

#### Acceptance Criteria
- [ ] All integration tests pass
- [ ] Auth flow works end-to-end
- [ ] Scope validation works across components
- [ ] URL manipulation is blocked
- [ ] No console errors

#### Progress Report Template
```
Task 5.2: [STATUS] - Scenarios: [X/Y passed]. Issues: [none/list].
Example: Task 5.2: [COMPLETED] - All 3 integration scenarios passed. No issues found.
```

---

### TASK-5.3: Run E2E Tests

**Task ID:** `TASK-5.3`  
**Status:** [ ] PENDING  
**Estimated Time:** 1 hour  
**Dependencies:** TASK-5.2 (integration tests passed)  
**Assigned To:** AI Agent  

#### Description
Run end-to-end tests in real browser to verify complete user flows.

#### Deliverables
1. ✅ E2E test results
2. ✅ User flow verification
3. ✅ Screenshots/videos of tests
4. ✅ Test report

#### E2E Test Cases

**Test Case 1: Accountant Cannot Access Other Orgs**
```typescript
// 1. Login as accountant
cy.visit('/login');
cy.get('[data-testid="email"]').type('accountant@example.com');
cy.get('[data-testid="password"]').type('password');
cy.get('[data-testid="login-button"]').click();

// 2. Check org dropdown only shows their orgs
cy.get('[data-testid="org-selector"]').click();
cy.get('[data-testid="org-option"]').should('have.length', 2);

// 3. Try to access unauthorized org via URL
cy.visit('/organizations/other-org-uuid/settings');

// 4. Should redirect to unauthorized
cy.url().should('include', '/unauthorized');
cy.contains('Access Denied').should('be.visible');
```

**Test Case 2: Admin Can Access Multiple Orgs**
```typescript
// 1. Login as admin
cy.visit('/login');
cy.get('[data-testid="email"]').type('admin@example.com');
cy.get('[data-testid="password"]').type('password');
cy.get('[data-testid="login-button"]').click();

// 2. Check org dropdown shows multiple orgs
cy.get('[data-testid="org-selector"]').click();
cy.get('[data-testid="org-option"]').should('have.length.greaterThan', 2);

// 3. Switch between orgs
cy.get('[data-testid="org-option"]').first().click();
cy.get('[data-testid="current-org"]').should('contain', 'Org 1');

cy.get('[data-testid="org-selector"]').click();
cy.get('[data-testid="org-option"]').eq(1).click();
cy.get('[data-testid="current-org"]').should('contain', 'Org 2');
```

**Test Case 3: Super Admin Sees Everything**
```typescript
// 1. Login as super admin
cy.visit('/login');
cy.get('[data-testid="email"]').type('superadmin@example.com');
cy.get('[data-testid="password"]').type('password');
cy.get('[data-testid="login-button"]').click();

// 2. Check org dropdown shows all orgs
cy.get('[data-testid="org-selector"]').click();
cy.get('[data-testid="org-option"]').should('have.length.greaterThan', 5);

// 3. Can access any org
cy.visit('/organizations/any-org-uuid/settings');
cy.url().should('include', '/settings');
```

#### Acceptance Criteria
- [ ] All E2E tests pass
- [ ] Tests run in real browser
- [ ] User flows work correctly
- [ ] Screenshots/videos captured
- [ ] No console errors

#### Progress Report Template
```
Task 5.3: [STATUS] - Tests: [X/Y passed]. Browser: [Chrome/Firefox]. Issues: [none/list].
Example: Task 5.3: [COMPLETED] - All 3 E2E tests passed in Chrome. Screenshots captured. No issues.
```

---

### TASK-5.4: Performance Testing

**Task ID:** `TASK-5.4`  
**Status:** [ ] PENDING  
**Estimated Time:** 1 hour  
**Dependencies:** TASK-5.3 (E2E tests passed)  
**Assigned To:** AI Agent  

#### Description
Test performance to ensure changes don't degrade user experience.

#### Deliverables
1. ✅ Performance metrics
2. ✅ Comparison with baseline
3. ✅ Optimization recommendations
4. ✅ Performance report

#### Performance Tests

**Test 1: Auth Load Time**
```typescript
const start = performance.now();
await loadAuthData(userId);
const end = performance.now();
const loadTime = end - start;

// Target: < 500ms
expect(loadTime).toBeLessThan(500);
```

**Test 2: Permission Check Time**
```typescript
const start = performance.now();
for (let i = 0; i < 1000; i++) {
  hasActionAccessInOrg('transactions.create', 'org-1-uuid');
}
const end = performance.now();
const avgTime = (end - start) / 1000;

// Target: < 1ms per call
expect(avgTime).toBeLessThan(1);
```

**Test 3: Org Selection Time**
```typescript
const start = performance.now();
await setOrganization('org-1-uuid');
const end = performance.now();
const selectionTime = end - start;

// Target: < 200ms
expect(selectionTime).toBeLessThan(200);
```

**Test 4: Route Navigation Time**
```typescript
const start = performance.now();
navigate('/transactions');
// Wait for page to load
await waitFor(() => screen.getByText('Transactions'));
const end = performance.now();
const navTime = end - start;

// Target: < 2000ms
expect(navTime).toBeLessThan(2000);
```

#### Performance Targets
| Metric | Target | Acceptable | Current |
|--------|--------|------------|---------|
| Auth load time | < 500ms | < 1000ms | [TBD] |
| Permission check | < 1ms | < 5ms | [TBD] |
| Org selection | < 200ms | < 500ms | [TBD] |
| Route navigation | < 2000ms | < 3000ms | [TBD] |

#### Acceptance Criteria
- [ ] All performance targets met
- [ ] No significant degradation from baseline
- [ ] Metrics documented
- [ ] Optimization recommendations provided (if needed)

#### Progress Report Template
```
Task 5.4: [STATUS] - Metrics: [met/exceeded/failed]. Degradation: [none/X%].
Example: Task 5.4: [COMPLETED] - All performance targets met. Auth load: 350ms. No degradation.
```

---

### TASK-5.5: User Acceptance Testing

**Task ID:** `TASK-5.5`  
**Status:** [ ] PENDING  
**Estimated Time:** 2 hours  
**Dependencies:** TASK-5.4 (performance tested)  
**Assigned To:** AI Agent  

#### Description
Manual testing with real users to verify user experience and catch any issues.

#### Deliverables
1. ✅ UAT test results
2. ✅ User feedback
3. ✅ Issues identified
4. ✅ UAT report

#### UAT Test Plan

**User Type 1: Accountant**
- [ ] Login successfully
- [ ] See only their organizations in dropdown
- [ ] Select organization successfully
- [ ] Access transactions page
- [ ] Cannot access unauthorized org (via dropdown)
- [ ] Cannot access unauthorized org (via URL)
- [ ] See clear error message for unauthorized access
- [ ] Can switch between their organizations
- [ ] Project cleared when org changes

**User Type 2: Admin**
- [ ] Login successfully
- [ ] See multiple organizations
- [ ] Can manage users in their orgs
- [ ] Cannot manage users in other orgs
- [ ] Can access all features in their orgs

**User Type 3: Super Admin**
- [ ] Login successfully
- [ ] See all organizations
- [ ] Can access any organization
- [ ] Can manage any resource
- [ ] No restrictions

#### User Feedback Questions
1. Is the org selection process clear?
2. Are error messages helpful?
3. Is the navigation intuitive?
4. Any confusing behavior?
5. Any performance issues?

#### Acceptance Criteria
- [ ] All user types tested
- [ ] No critical issues found
- [ ] User feedback positive
- [ ] Error messages clear
- [ ] Performance acceptable

#### Progress Report Template
```
Task 5.5: [STATUS] - Users tested: [X]. Issues: [Y critical, Z minor]. Feedback: [positive/negative].
Example: Task 5.5: [COMPLETED] - 5 users tested. 0 critical issues. 2 minor UI issues. Feedback positive.
```

---

### TASK-5.6: Production Deployment

**Task ID:** `TASK-5.6`  
**Status:** [ ] PENDING  
**Estimated Time:** 2 hours  
**Dependencies:** TASK-5.5 (UAT passed)  
**Assigned To:** AI Agent  

#### Description
Deploy all changes to production environment.

#### Deliverables
1. ✅ Database migrations deployed
2. ✅ Frontend code deployed
3. ✅ Deployment verification
4. ✅ Deployment report

#### Deployment Steps

**Step 1: Pre-Deployment Checklist**
- [ ] All tests passed
- [ ] UAT completed
- [ ] Manager approval obtained
- [ ] Backup created
- [ ] Rollback plan ready
- [ ] Deployment window scheduled
- [ ] Team notified

**Step 2: Database Deployment**
```bash
# 1. Create backup
# (Already done in TASK-1.1)

# 2. Deploy Quick Wins (RLS policies)
# Run in Supabase SQL Editor:
sql/quick_wins_fix_rls_policies.sql

# 3. Deploy Migration 1 (add org_id column)
# Run in Supabase SQL Editor:
supabase/migrations/20260123_add_org_id_to_user_roles.sql

# 4. Deploy Migration 2 (enhanced auth RPC)
# Run in Supabase SQL Editor:
supabase/migrations/20260123_create_enhanced_auth_rpc.sql

# 5. Verify deployments
# Run verification queries from each task
```

**Step 3: Frontend Deployment**
```bash
# 1. Build production bundle
npm run build

# 2. Run final checks
npm run type-check
npm run lint

# 3. Deploy to production
npm run deploy
# OR
vercel --prod
# OR
git push origin main  # (if auto-deploy configured)

# 4. Wait for deployment to complete
# 5. Verify deployment URL
```

**Step 4: Post-Deployment Verification**
```bash
# 1. Check production site loads
curl https://your-production-url.com

# 2. Login as test users
# - Accountant
# - Admin
# - Super admin

# 3. Verify scope validation works
# - Try to access unauthorized org
# - Check error messages
# - Verify redirects

# 4. Check database logs
# - No errors
# - RLS policies working
# - Enhanced RPC being called

# 5. Monitor performance
# - Page load times
# - API response times
# - Database query times
```

#### Acceptance Criteria
- [ ] Database migrations deployed successfully
- [ ] Frontend code deployed successfully
- [ ] Production site loads correctly
- [ ] Scope validation works in production
- [ ] No errors in logs
- [ ] Performance acceptable

#### Rollback Procedure
```bash
# If issues occur:

# 1. Rollback frontend
git revert <commit-hash>
npm run build
npm run deploy

# 2. Rollback database
# Run rollback SQL from each migration file

# 3. Verify rollback successful
# Test with accountant user

# 4. Notify team
# Document issues found
```

#### Progress Report Template
```
Task 5.6: [STATUS] - Database: [deployed/failed]. Frontend: [deployed/failed]. Verification: [passed/failed].
Example: Task 5.6: [COMPLETED] - Database deployed successfully. Frontend deployed. All verifications passed.
```

---

### TASK-5.7: Post-Deployment Monitoring

**Task ID:** `TASK-5.7`  
**Status:** [ ] PENDING  
**Estimated Time:** 24 hours (ongoing)  
**Dependencies:** TASK-5.6 (deployed to production)  
**Assigned To:** AI Agent  

#### Description
Monitor production environment for 24 hours after deployment to catch any issues.

#### Deliverables
1. ✅ Monitoring dashboard setup
2. ✅ Error logs reviewed
3. ✅ Performance metrics tracked
4. ✅ Monitoring report

#### Monitoring Checklist

**Hour 1: Immediate Monitoring**
- [ ] Check error logs (no new errors)
- [ ] Verify user logins working
- [ ] Check scope validation working
- [ ] Monitor API response times
- [ ] Check database query performance

**Hour 4: Short-term Monitoring**
- [ ] Review error logs
- [ ] Check user feedback
- [ ] Monitor performance metrics
- [ ] Verify no unauthorized access attempts
- [ ] Check support tickets

**Hour 12: Mid-term Monitoring**
- [ ] Review all logs
- [ ] Analyze performance trends
- [ ] Check for any patterns
- [ ] Review user behavior
- [ ] Document any issues

**Hour 24: Final Monitoring**
- [ ] Comprehensive log review
- [ ] Performance analysis
- [ ] User feedback summary
- [ ] Issue summary
- [ ] Final report

#### Metrics to Monitor
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Error rate | < 0.1% | > 1% |
| Auth load time | < 500ms | > 1000ms |
| API response time | < 200ms | > 500ms |
| Database query time | < 50ms | > 200ms |
| Unauthorized access attempts | 0 | > 5 |

#### Acceptance Criteria
- [ ] No critical errors
- [ ] Performance within targets
- [ ] No unauthorized access
- [ ] User feedback positive
- [ ] Support tickets minimal

#### Progress Report Template
```
Task 5.7: [STATUS] - Errors: [X]. Performance: [acceptable/degraded]. Issues: [none/list].
Example: Task 5.7: [COMPLETED] - 24h monitoring complete. 0 errors. Performance excellent. No issues.
```

---

## ✅ PHASE 5 COMPLETION CHECKLIST

### All Tasks Complete
- [ ] TASK-5.1: Unit tests passed
- [ ] TASK-5.2: Integration tests passed
- [ ] TASK-5.3: E2E tests passed
- [ ] TASK-5.4: Performance tested
- [ ] TASK-5.5: UAT completed
- [ ] TASK-5.6: Deployed to production
- [ ] TASK-5.7: Monitoring complete

### Verification
- [ ] All tests passed
- [ ] Performance acceptable
- [ ] UAT successful
- [ ] Production deployment successful
- [ ] No critical issues in 24h monitoring

### Documentation
- [ ] Test reports completed
- [ ] Deployment report completed
- [ ] Monitoring report completed
- [ ] Any issues documented

### Sign-Off
```
Phase 5 Completion Report:
- Completed: [Date/Time]
- All tasks: [COMPLETED/BLOCKED]
- Tests: [X/Y passed]
- Performance: [acceptable/degraded]
- Deployment: [successful/failed]
- Monitoring: [24h complete]
- Issues found: [None/List issues]
- Project Status: [COMPLETE/NEEDS WORK]
- Notes: [Any additional notes]
```

---

## 📊 PROJECT SUMMARY

### Total Tasks: 28

**Phase 0: Quick Wins** - 4 tasks (30 minutes)  
**Phase 1: Database Schema** - 6 tasks (2 days)  
**Phase 2: Frontend Auth** - 5 tasks (3 days)  
**Phase 3: ScopeContext** - 4 tasks (2 days)  
**Phase 4: Route Protection** - 5 tasks (2 days)  
**Phase 5: Testing & Deployment** - 7 tasks (2 days)  

### Estimated Timeline: 1-2 weeks

**Week 1:**
- Day 1: Phase 0 + Phase 1 (Tasks 0.1-1.6)
- Day 2-3: Phase 1 completion + Phase 2 start (Tasks 1.4-2.3)
- Day 4-5: Phase 2 completion + Phase 3 (Tasks 2.4-3.4)

**Week 2:**
- Day 1-2: Phase 4 (Tasks 4.1-4.5)
- Day 3-4: Phase 5 Testing (Tasks 5.1-5.5)
- Day 5: Phase 5 Deployment (Tasks 5.6-5.7)

### Success Metrics

**Security Metrics:**
- ✅ Accountant cannot access unauthorized organizations
- ✅ RLS policies enforce data isolation
- ✅ Route protection validates scope
- ✅ No cross-org data leakage

**Performance Metrics:**
- ✅ Auth load time < 500ms
- ✅ Permission checks < 1ms
- ✅ No N+1 queries
- ✅ Page load time < 2s

**User Experience:**
- ✅ Clear error messages
- ✅ Smooth org/project selection
- ✅ No unexpected redirects
- ✅ Intuitive navigation

---

## 🎯 CRITICAL SUCCESS FACTORS

### Must-Have Requirements
1. **Database backup before any changes** - Rollback capability
2. **RLS policies deployed first** - Immediate security improvement
3. **Comprehensive testing** - No production bugs
4. **User acceptance testing** - Verify UX is good
5. **24h monitoring** - Catch issues early

### Risk Mitigation
1. **Backward compatible design** - Old code still works
2. **Incremental deployment** - Deploy in phases
3. **Rollback plan ready** - Can revert quickly
4. **Comprehensive testing** - Catch issues before production
5. **Monitoring and alerts** - Detect issues immediately

### Quality Gates
- [ ] All tests pass before deployment
- [ ] Performance targets met
- [ ] UAT successful
- [ ] Manager approval obtained
- [ ] Rollback plan tested

---

## 📝 PROGRESS REPORTING GUIDELINES

### Daily Progress Report Format
```
Date: [YYYY-MM-DD]
Phase: [Phase X]
Tasks Completed Today: [X/Y]

Completed Tasks:
- Task X.Y: [COMPLETED] - [Brief description of what was done]
- Task X.Z: [COMPLETED] - [Brief description of what was done]

In-Progress Tasks:
- Task X.A: [IN-PROGRESS] - [Current status, % complete]

Blocked Tasks:
- Task X.B: [BLOCKED] - [Reason for blockage, what's needed to unblock]

Issues Found:
- [Issue 1 description]
- [Issue 2 description]

Next Steps:
- [What will be done tomorrow]

Overall Progress: [X%]
On Track: [YES/NO]
```

### Weekly Summary Report Format
```
Week: [Week X]
Phases Completed: [Phase X, Phase Y]
Total Tasks Completed: [X/28]

Highlights:
- [Major accomplishment 1]
- [Major accomplishment 2]

Challenges:
- [Challenge 1 and how it was resolved]
- [Challenge 2 and how it was resolved]

Test Results:
- Unit tests: [X/Y passed]
- Integration tests: [X/Y passed]
- E2E tests: [X/Y passed]

Performance:
- Auth load time: [X ms]
- Permission checks: [X ms]
- Overall: [acceptable/needs optimization]

Next Week Plan:
- [Phase to complete]
- [Key milestones]

Overall Progress: [X%]
On Track: [YES/NO]
Estimated Completion: [Date]
```

### Final Project Report Format
```
Project: Enterprise Auth Security Fix
Completion Date: [YYYY-MM-DD]
Total Duration: [X weeks]

Summary:
- Total tasks: 28
- Completed: [X]
- Blocked: [Y]
- Success rate: [X%]

Phases Completed:
- Phase 0: Quick Wins ✅
- Phase 1: Database Schema ✅
- Phase 2: Frontend Auth ✅
- Phase 3: ScopeContext ✅
- Phase 4: Route Protection ✅
- Phase 5: Testing & Deployment ✅

Test Results:
- Unit tests: [X/Y passed - X%]
- Integration tests: [X/Y passed - X%]
- E2E tests: [X/Y passed - X%]
- Performance tests: [PASS/FAIL]
- UAT: [PASS/FAIL]

Performance Metrics:
- Auth load time: [X ms] (target: < 500ms)
- Permission checks: [X ms] (target: < 1ms)
- Org selection: [X ms] (target: < 200ms)
- Route navigation: [X ms] (target: < 2000ms)

Security Verification:
- ✅ Accountant cannot access unauthorized orgs
- ✅ RLS policies enforce isolation
- ✅ Route protection validates scope
- ✅ URL manipulation blocked

Issues Found:
- Critical: [X]
- Major: [Y]
- Minor: [Z]
- All resolved: [YES/NO]

Deployment:
- Database: [SUCCESS/FAILED]
- Frontend: [SUCCESS/FAILED]
- Verification: [PASS/FAIL]
- Rollback needed: [YES/NO]

Post-Deployment Monitoring:
- Duration: 24 hours
- Errors: [X]
- Performance: [acceptable/degraded]
- User feedback: [positive/negative]

Lessons Learned:
- [Lesson 1]
- [Lesson 2]
- [Lesson 3]

Recommendations:
- [Recommendation 1]
- [Recommendation 2]

Project Status: [COMPLETE/NEEDS WORK]
```

---

## 🔧 TROUBLESHOOTING GUIDE

### Common Issues and Solutions

#### Issue 1: Enhanced RPC Returns Empty Organizations
**Symptoms:** `userOrganizations` array is empty after login  
**Cause:** User not in `org_memberships` table  
**Solution:**
```sql
-- Add user to org_memberships
INSERT INTO org_memberships (user_id, org_id, is_default)
VALUES ('user-id', 'org-id', true);
```

#### Issue 2: RLS Policies Block Everything
**Symptoms:** User cannot see any data, even their own orgs  
**Cause:** `org_memberships` table is empty  
**Solution:**
```sql
-- Populate org_memberships with default assignments
INSERT INTO org_memberships (user_id, org_id, is_default)
SELECT up.id, o.id, true
FROM user_profiles up
CROSS JOIN (SELECT id FROM organizations LIMIT 1) o
ON CONFLICT DO NOTHING;
```

#### Issue 3: TypeScript Compilation Errors
**Symptoms:** `Property 'belongsToOrg' does not exist on type...`  
**Cause:** Interface not updated or exports missing  
**Solution:**
1. Check `useOptimizedAuth` interface includes new fields
2. Check return statement exports new functions
3. Run `npm run type-check` to verify

#### Issue 4: Infinite Redirect Loop
**Symptoms:** Page keeps redirecting between routes  
**Cause:** Route protection logic has circular dependency  
**Solution:**
1. Check `requiresOrgAccess` logic
2. Ensure `/select-organization` route is not protected
3. Add console logging to debug redirect chain

#### Issue 5: Performance Degradation
**Symptoms:** Slow page loads, high database query times  
**Cause:** Missing indexes or N+1 queries  
**Solution:**
```sql
-- Check if indexes exist
SELECT * FROM pg_indexes WHERE tablename = 'user_roles';

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_org_id ON user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_org ON user_roles(user_id, organization_id);
```

#### Issue 6: User Sees "Access Denied" for Their Own Org
**Symptoms:** User belongs to org but gets access denied  
**Cause:** `org_memberships` data is stale or cache issue  
**Solution:**
1. Verify user is in `org_memberships`:
```sql
SELECT * FROM org_memberships WHERE user_id = 'user-id';
```
2. Clear browser cache and localStorage
3. Force auth refresh:
```typescript
await refreshAuth();
```

---

## 📚 REFERENCE DOCUMENTS

### Implementation Guides
- `ENTERPRISE_AUTH_IMPLEMENTATION_ACTION_PLAN.md` - Detailed implementation steps
- `ENTERPRISE_AUTH_READY_TO_DEPLOY.md` - Deployment guide
- `ENTERPRISE_AUTH_DEVELOPER_QUICK_REFERENCE.md` - Developer cheat sheet

### Analysis Documents
- `ENTERPRISE_AUTH_REVISED_ANALYSIS.md` - Problem analysis based on actual database
- `MANAGER_REPORT_ENTERPRISE_AUTH_SECURITY_FIX.md` - Manager report

### SQL Scripts
- `sql/quick_wins_fix_rls_policies.sql` - Quick Wins (deploy first)
- `supabase/migrations/20260123_add_org_id_to_user_roles.sql` - Add org_id column
- `supabase/migrations/20260123_create_enhanced_auth_rpc.sql` - Enhanced auth RPC

### Code Files
- `src/hooks/useOptimizedAuth.ts` - Auth hook with scope support
- `src/contexts/ScopeContext.tsx` - Org/project selection context
- `src/components/routing/OptimizedProtectedRoute.tsx` - Route protection

---

## ✅ FINAL CHECKLIST

### Pre-Deployment
- [ ] All 28 tasks completed
- [ ] All tests passed (unit, integration, E2E)
- [ ] Performance targets met
- [ ] UAT successful
- [ ] Manager approval obtained
- [ ] Database backup created
- [ ] Rollback plan ready
- [ ] Team notified

### Deployment
- [ ] Quick Wins deployed (RLS policies)
- [ ] Database migrations deployed
- [ ] Frontend code deployed
- [ ] Deployment verified
- [ ] No errors in logs

### Post-Deployment
- [ ] 24h monitoring complete
- [ ] No critical issues
- [ ] Performance acceptable
- [ ] User feedback positive
- [ ] Support tickets minimal
- [ ] Final report completed

### Documentation
- [ ] All progress reports completed
- [ ] Test reports completed
- [ ] Deployment report completed
- [ ] Monitoring report completed
- [ ] Lessons learned documented

---

## 🎉 PROJECT COMPLETION CRITERIA

The project is considered **COMPLETE** when:

1. ✅ All 28 tasks are marked [COMPLETED]
2. ✅ All tests pass (unit, integration, E2E, performance, UAT)
3. ✅ Deployed to production successfully
4. ✅ 24h monitoring shows no critical issues
5. ✅ Security verification passed:
   - Accountant cannot access unauthorized orgs
   - RLS policies enforce isolation
   - Route protection validates scope
   - URL manipulation blocked
6. ✅ Performance targets met:
   - Auth load time < 500ms
   - Permission checks < 1ms
   - Page load time < 2s
7. ✅ User feedback positive
8. ✅ Manager sign-off obtained
9. ✅ All documentation completed

---

## 📞 SUPPORT AND ESCALATION

### For Questions or Issues

**Technical Issues:**
- Review troubleshooting guide above
- Check reference documents
- Review task acceptance criteria
- Check verification queries

**Blockers:**
- Document blocker in progress report
- Identify what's needed to unblock
- Escalate to team lead if needed
- Consider alternative approaches

**Critical Issues:**
- Stop deployment immediately
- Execute rollback procedure
- Document issue thoroughly
- Notify team and manager
- Schedule post-mortem

---

## 🚀 READY TO START

This execution plan is complete and ready for AI agent implementation. 

**To begin:**
1. Start with Phase 0, Task 0.1
2. Follow tasks in order
3. Mark each task status as you progress
4. Report progress using provided templates
5. Document any issues or blockers
6. Complete all acceptance criteria before moving to next task

**Remember:**
- Backup database before any changes
- Test thoroughly at each phase
- Document everything
- Ask for help if blocked
- Follow the rollback plan if issues occur

---

**Good luck! 🎯**

---

**Document Version:** 1.0  
**Last Updated:** January 23, 2026  
**Status:** ✅ READY FOR EXECUTION  
**Total Tasks:** 28  
**Estimated Duration:** 1-2 weeks  
**Priority:** 🔴 CRITICAL SECURITY FIX  

