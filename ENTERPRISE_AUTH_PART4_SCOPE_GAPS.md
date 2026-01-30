# Part 4: Detailed Scope Enforcement Gaps

## Gap 1: ScopeContext Has No Validation

**Current Implementation:**
```typescript
// src/contexts/ScopeContext.tsx
setOrganization: (orgId: string | null) => Promise<void>;
```

**Problem:** Any user can select any organization - no membership check

**What's Missing:**
1. Check if user is member of `user_organizations`
2. Check if user has active role in that org
3. Reject unauthorized org selection
4. Clear scope if user loses access

**Impact:** Accountant can select admin's organization and access their data

---

## Gap 2: Auth System Doesn't Load Org/Project Memberships

**Current Implementation:**
```typescript
// src/hooks/useOptimizedAuth.ts - loadAuthData()
// Loads: user profile, roles
// Missing: organization memberships, project assignments
```

**What's Missing:**
```typescript
interface AuthState {
  user: User;
  profile: Profile;
  roles: RoleSlug[];
  
  // MISSING:
  organizations: string[];  // org IDs user belongs to
  projects: string[];       // project IDs user can access
  orgRoles: Map<string, RoleSlug[]>;  // roles per org
}
```

**Impact:** No way to validate if user belongs to selected org

---

## Gap 3: Route Protection Ignores Scope

**Current Implementation:**
```typescript
// src/components/routing/OptimizedProtectedRoute.tsx
const routeAllowed = hasRouteAccess(pathname);
const actionAllowed = hasActionAccess(requiredAction);

// MISSING: Scope validation
```

**What Should Happen:**
```typescript
// Extract org/project from route params
const { orgId, projectId } = useParams();

// Validate user belongs to this org/project
const scopeAllowed = validateScopeAccess(orgId, projectId);

if (!scopeAllowed) {
  return <Navigate to="/unauthorized" />;
}
```

**Impact:** User can access `/organizations/:anyOrgId/settings`

---

## Gap 4: Permission Checks Are Global, Not Scoped

**Current Problem:**
```typescript
// permissions.ts - accountant role
accountant: {
  routes: ['/main-data/*'],  // ALL main data
  actions: ['accounts.view']  // ALL accounts
}
```

**Should Be:**
```typescript
// Check permission IN CONTEXT of current org
hasActionAccess('accounts.view', currentOrgId)

// Database query should be:
SELECT * FROM accounts 
WHERE organization_id = currentOrgId
AND user_has_permission(user_id, 'accounts.view', currentOrgId)
```

**Impact:** Accountant sees accounts from ALL organizations

---

## Gap 5: Navigation Doesn't Filter by Org Membership

**Current Implementation:**
```typescript
// src/data/navigation.ts
// Shows all menu items if user has permission globally
```

**What's Missing:**
```typescript
// Filter menu items by:
// 1. User has permission
// 2. User belongs to current org
// 3. Feature enabled for this org

const visibleItems = navigationItems.filter(item => {
  const hasPermission = checkPermission(item.requiredPermission);
  const hasOrgAccess = userOrgs.includes(currentOrgId);
  const orgHasFeature = orgFeatures[currentOrgId]?.includes(item.feature);
  
  return hasPermission && hasOrgAccess && orgHasFeature;
});
```

**Impact:** Menu shows items user can't actually use

---

## Gap 6: RLS Policies May Not Be Enforcing Scope

**Database Issue:**
```sql
-- Current RLS might be:
CREATE POLICY "Users can view transactions"
ON transactions FOR SELECT
USING (auth.uid() = created_by OR has_permission('transactions.view'));

-- MISSING: Organization scope check
-- Should be:
CREATE POLICY "Users can view org transactions"
ON transactions FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
  AND has_permission('transactions.view', organization_id)
);
```

**Impact:** Backend may allow cross-org data access

---

## Gap 7: No Org-Scoped Role Assignment

**Current Database:**
```sql
-- user_roles table has organization_id column
-- But frontend doesn't use it!
```

**What Should Happen:**
```typescript
// User can have different roles in different orgs
const userRoles = {
  'org-1': ['accountant'],
  'org-2': ['admin'],
  'org-3': ['viewer']
};

// Permission check must include org context
hasPermission('organizations.manage', 'org-2') // true
hasPermission('organizations.manage', 'org-1') // false
```

**Impact:** User's role applies globally instead of per-org

