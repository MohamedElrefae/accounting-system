# Enterprise Auth, Scope & Routing - Deep Analysis (Revised)

**Date:** January 23, 2026  
**Revision:** 2.0 - Scope-Focused Analysis  
**Prepared By:** Senior Engineering Team (15+ Years Experience)  
**Status:** CRITICAL - Scope Context Not Enforced in Routes/Auth

---

## Executive Summary - Revised Understanding

After deeper analysis, the issue is **NOT that accountant role has wrong permissions**. The core problems are:

1. **Scope Context Exists But Not Enforced** - Organization/project scoping implemented but not integrated with auth/routing
2. **Route Protection Ignores Scope** - Routes check permissions but not org/project membership
3. **Frontend Permission Matrix Disconnected** - `permissions.ts` doesn't match database schema
4. **No Scope-Aware Permission Checks** - User can access ANY org's data if they have the permission

### The Real Problem

```
User has role "accountant" with correct permissions in database
✓ Database has organization_id and project_id scoping
✓ ScopeContext exists for org/project selection
✗ Auth system doesn't check if user belongs to selected org
✗ Routes don't validate org/project membership
✗ Permission checks are global, not scoped to user's orgs
```

---

## Part 1: Database Schema Analysis

### Run These SQL Queries First

```bash
# In Supabase SQL Editor, run these files in order:
1. sql/comprehensive_schema_analysis.sql
2. sql/organization_project_scope_analysis.sql
3. sql/auth_rpc_functions_analysis.sql
4. sql/test_accountant_user_permissions.sql
```

### Expected Database Structure

Based on code analysis, your database SHOULD have:

```sql
-- User belongs to organizations
user_organizations (
  user_id UUID,
  organization_id UUID,
  is_primary BOOLEAN,
  created_at TIMESTAMPTZ
)

-- User assigned to projects
user_projects (
  user_id UUID,
  project_id UUID,
  role TEXT,  -- project-specific role
  created_at TIMESTAMPTZ
)

-- Roles can be org-scoped
user_roles (
  user_id UUID,
  role_id UUID,
  organization_id UUID,  -- CRITICAL: role applies to this org
  project_id UUID,       -- OPTIONAL: role applies to this project
  created_at TIMESTAMPTZ
)

-- All data tables have scope
transactions (
  id UUID,
  organization_id UUID,  -- CRITICAL: data belongs to org
  project_id UUID,       -- OPTIONAL: data belongs to project
  created_by UUID,
  ...
)
```


---

## Part 2: Current Implementation Analysis

### 2.1 ScopeContext (EXISTS but NOT ENFORCED)

**File:** `src/contexts/ScopeContext.tsx`

**What It Does:**
- Manages current organization/project selection
- Provides `currentOrg` and `currentProject` state
- Has `setOrganization()` and `setProject()` methods

**What It DOESN'T Do:**
- ❌ Doesn't validate user belongs to selected org
- ❌ Doesn't integrate with auth system
- ❌ Doesn't restrict route access based on org membership
- ❌ Doesn't filter data by user's org/project assignments

**Critical Gap:**
```typescript
// ScopeContext allows ANY user to select ANY organization
setOrganization: (orgId: string | null) => Promise<void>;

// MISSING: Should be
setOrganization: (orgId: string | null) => Promise<void> {
  // 1. Check if user is member of this org
  // 2. Check if user has permission in this org
  // 3. Reject if not authorized
}
```

### 2.2 Auth System (IGNORES SCOPE)

**File:** `src/hooks/useOptimizedAuth.ts`

**Current Flow:**
```typescript
1. User logs in
2. Load user profile
3. Load user roles (global, not org-scoped)
4. Flatten permissions (global, not org-scoped)
5. Cache permissions
```

**Missing Scope Integration:**
```typescript
// CURRENT: Returns global permissions
hasActionAccess(action: PermissionCode): boolean

// SHOULD BE: Returns org-scoped permissions
hasActionAccess(
  action: PermissionCode, 
  organizationId?: string,
  projectId?: string
): boolean
```

### 2.3 Route Protection (NO SCOPE VALIDATION)

**File:** `src/components/routing/OptimizedProtectedRoute.tsx`

**Current Logic:**
```typescript
// Only checks if user has permission globally
const routeAllowed = hasRouteAccess(pathname);
const actionAllowed = !requiredAction || hasActionAccess(requiredAction);

// MISSING: Check if user can access current org/project
// MISSING: Validate route params (org_id, project_id) against user membership
```

**Example Vulnerability:**
```typescript
// Route: /organizations/:orgId/settings
// Current: Checks if user has "organizations.manage" permission
// Problem: Doesn't check if user belongs to orgId
// Result: User can access ANY organization's settings
```


### 2.4 Permission Matrix (FRONTEND ONLY, NO DATABASE SYNC)

**File:** `src/lib/permissions.ts`

**Critical Issues:**

1. **Hardcoded in Frontend** - Not synced with database
2. **No Org Scoping** - All permissions are global
3. **Route Wildcards** - Too broad (e.g., `/main-data/*`)

```typescript
// CURRENT: Frontend-only permission matrix
accountant: {
  routes: [
    '/transactions/*',  // Can access all transaction routes
    '/main-data/*',     // Can access all main data routes
  ],
  actions: [
    'transactions.create',
    'accounts.view',
  ]
}

// PROBLEM: This doesn't match database structure
// Database has: user_roles with organization_id
// Frontend ignores: organization_id completely
```

---

## Part 3: Root Cause Analysis

### Issue 1: Accountant Can Edit Organizations

**Screenshot Evidence:** Accountant accessing organization management

**Root Cause Chain:**
```
1. ScopeContext allows selecting any organization
   ↓
2. Route /settings/organization-management has NO permission check
   ↓
3. OptimizedProtectedRoute only checks global permissions
   ↓
4. No validation that user belongs to selected org
   ↓
5. User can edit ANY organization
```

**Database Reality:**
```sql
-- User IS member of specific organizations
SELECT * FROM user_organizations WHERE user_id = 'accountant_id';
-- Returns: org_1, org_2

-- But frontend allows selecting org_3, org_4, org_5...
-- No validation!
```

### Issue 2: Disabled Buttons in Main Data

**Screenshot Evidence:** Buttons visible but disabled

**Root Cause:**
```
1. Navigation shows all main-data items (no filtering)
   ↓
2. Page loads and checks permissions
   ↓
3. Some buttons disabled based on permission
   ↓
4. Inconsistent UX - should hide entire menu item
```

**Should Be:**
```typescript
// Filter navigation based on:
// 1. User's role permissions
// 2. User's org membership
// 3. Current selected org/project

const visibleNavItems = navigationItems.filter(item => {
  return hasPermission(item.requiredPermission) 
    && belongsToCurrentOrg()
    && (item.requiresProject ? hasProjectAccess() : true);
});
```

