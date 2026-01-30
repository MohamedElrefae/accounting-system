# Permission Architecture Design Document

**Version**: 2.0  
**Date**: January 28, 2026  
**Status**: Pending Manager Approval  
**Author**: Engineering Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Identified Problems](#identified-problems)
4. [Proposed Architecture](#proposed-architecture)
5. [Permission Matrix Comparison](#permission-matrix-comparison)
6. [Navigation Structure Changes](#navigation-structure-changes)
7. [Role Definitions](#role-definitions)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Risk Assessment](#risk-assessment)
10. [Appendix: Complete Permission Codes](#appendix-complete-permission-codes)

---

## Executive Summary

The current permission system has design flaws causing **incorrect navigation visibility** and **authentication flickering**. Users report seeing menu items they shouldn't access while valid items are hidden.

### Key Issues
- Parent menus block child visibility even when user has child-level permissions
- Permission codes used in navigation don't exist in the security matrix
- Cache corruption causes role flickering on page load

### Proposed Solution
Implement a **granular entity-based permission model** where:
- Each entity (accounts, transactions, documents, etc.) has its own `.view`, `.manage`, `.create` permissions
- Parent menus auto-display if any child is visible
- Authentication cache correctly preserves role mappings

---

## Current State Analysis

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PERMISSION SYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│  permissions.ts                                             │
│  ├── RoleSlug (7 roles)                                    │
│  ├── PermissionCode (28 codes)                             │
│  └── MATRIX (role → routes + actions)                      │
├─────────────────────────────────────────────────────────────┤
│  navigation.ts                                              │
│  └── NavigationItem[] with requiredPermission              │
├─────────────────────────────────────────────────────────────┤
│  Sidebar.tsx                                               │
│  └── filterItem() checks hasActionAccess(permission)       │
└─────────────────────────────────────────────────────────────┘
```

### Current Roles

| Role | Description | Inheritance |
|------|-------------|-------------|
| `super_admin` | Full system access | Inherits from `admin` |
| `admin` | Administrative access | Inherits from `manager` |
| `manager` | Management access | Inherits from `accountant`, `auditor` |
| `accountant` | Transaction entry | None |
| `auditor` | Read-only audit access | Inherits from `viewer` |
| `hr` | Human resources | Inherits from `viewer` |
| `team_leader` | Team oversight | Inherits from `viewer` |
| `viewer` | Basic read access | None |

### Current Permission Codes (28 Total)

```
accounts.manage, accounts.view
transactions.create, transactions.review, transactions.manage, transactions.cost_analysis
reports.view, reports.manage
sub_tree.view
templates.view, templates.manage, templates.generate
documents.view, documents.manage
inventory.view, inventory.manage
transaction_line_items.read
users.view, users.manage
data.export
settings.manage, settings.audit
fiscal.manage
approvals.manage, approvals.review
analysis.manage, analysis.view
presence.view.org, presence.view.team, presence.view.all
```

---

## Identified Problems

### Problem 1: Parent Menu Blocking

**Current Behavior (Broken)**:
```typescript
// navigation.ts
{
  id: "main-data",
  requiredPermission: "accounts.view",  // ← BLOCKS ALL CHILDREN
  children: [
    { id: "sub-tree", requiredPermission: "sub_tree.view" },
    { id: "accounts-tree", requiredPermission: "accounts.view" },
  ]
}
```

**Impact**: A user with `sub_tree.view` but NOT `accounts.view` cannot see the Sub Tree page because the parent menu blocks first.

### Problem 2: Missing Permission Codes

Navigation uses codes that **do not exist** in the MATRIX:

| Used in navigation.ts | Exists in MATRIX? | Affected Menu |
|-----------------------|-------------------|---------------|
| `transactions.read.own` | ❌ NO | My Transactions |
| `transactions.read.all` | ❌ NO | All Transactions |
| `approvals.view` | ❌ NO | Approvals Folder |
| `settings.preferences` | ❌ NO | Font Settings |
| `inventory.transfer` | ❌ NO | Inventory Transfer |
| `inventory.adjust` | ❌ NO | Inventory Adjust |

**Result**: `hasActionAccess('transactions.read.own')` always returns `false`, hiding menu items.

### Problem 3: Cache Corruption

The background refresh function (`fetchAndCacheAuthData`) saves `['viewer']` to cache when RPC returns empty roles, corrupting future loads.

### Problem 4: Coarse-Grained Permissions

Current model uses broad categories like `accounts.view` for entire sections instead of per-entity permissions.

---

## Proposed Architecture

### Design Principles

1. **Entity-Based Permissions**: Each entity gets `<entity>.view`, `<entity>.manage`, `<entity>.create`
2. **No Parent Permissions**: Parent menus auto-show if any child is visible
3. **Role Inheritance**: Roles inherit permissions from parent roles
4. **Explicit Over Implicit**: All permissions must be explicitly defined

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PROPOSED SYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│  permissions.ts                                             │
│  ├── RoleSlug (8 roles - add 'approver')                   │
│  ├── derivePermissionFromId()  ← NEW: Convention function  │
│  └── MATRIX (role → routes + granular actions)             │
├─────────────────────────────────────────────────────────────┤
│  navigation.ts                                              │
│  └── Items use `permissionEntity` instead of hardcoded     │
│      Permission auto-derived: `<entity>.view`              │
├─────────────────────────────────────────────────────────────┤
│  Sidebar.tsx                                               │
│  └── filterItem() uses derivePermissionFromId()            │
└─────────────────────────────────────────────────────────────┘
```

---

## Dynamic Convention-Based Permission System

### The Problem with Hardcoded Permissions

Current approach requires editing **3 files** to add a new entity:

1. `permissions.ts` - Add new `PermissionCode` type
2. `permissions.ts` - Add permission to role in MATRIX
3. `navigation.ts` - Add `requiredPermission: "entity.view"`

This is error-prone and not scalable.

### Proposed Solution: Convention Over Configuration

Use a **naming convention** where the permission code is **derived** from the navigation item's identity.

#### Convention Pattern

```
Navigation Item ID     →    Derived Permission
─────────────────────────────────────────────
"organizations"        →    "organizations.view"
"projects"             →    "projects.view"
"accounts-tree"        →    "accounts.view" (alias)
"sub-tree"             →    "sub_tree.view"
"transaction-line-items" → "transaction_line_items.view"
```

#### Implementation: `derivePermissionFromId()`

```typescript
// permissions.ts - NEW FUNCTION

/**
 * Convention-based permission derivation.
 * Converts navigation item ID to permission code.
 * 
 * @param itemId - The navigation item ID (e.g., "organizations", "sub-tree")
 * @param action - The action (default: "view")
 * @returns Derived permission code (e.g., "organizations.view")
 */
export function derivePermissionFromId(
  itemId: string, 
  action: 'view' | 'manage' | 'create' = 'view'
): string {
  // Normalize: kebab-case → snake_case
  const normalized = itemId
    .replace(/-/g, '_')           // sub-tree → sub_tree
    .replace(/\s+/g, '_')        // spaces → underscores
    .toLowerCase();
  
  // Apply aliases for backward compatibility
  const ALIASES: Record<string, string> = {
    'accounts_tree': 'accounts',
    'transaction_classification': 'classification',
    'document_templates': 'templates',
    'analysis_work_items': 'analysis',
    'work_items': 'work_items',
    'cost_centers': 'cost_centers',
    'fiscal_dashboard': 'fiscal',
    'fiscal_periods': 'fiscal',
  };
  
  const entity = ALIASES[normalized] || normalized;
  return `${entity}.${action}`;
}
```

#### Updated NavigationItem Type

```typescript
// types/index.ts - UPDATED

export interface NavigationItem {
  id: string;
  label: string;
  titleEn?: string;
  titleAr?: string;
  icon?: string;
  path?: string;
  
  // OLD: requiredPermission?: string;  // ← DEPRECATED
  
  // NEW: Dynamic permission options
  permissionEntity?: string;           // Entity name for permission derivation
  permissionAction?: 'view' | 'manage' | 'create';  // Default: 'view'
  
  // Override for special cases
  requiredPermission?: string;         // Still supported for backwards compat
  
  scope?: 'global' | 'org' | 'project';
  superAdminOnly?: boolean;
  children?: NavigationItem[];
}
```

#### Updated Sidebar filterItem()

```typescript
// Sidebar.tsx - filterItem() UPDATE

const filterItem = (item: NavigationItem): boolean => {
  if (item.superAdminOnly) {
    if (!user?.app_metadata?.roles?.includes('super_admin')) return false;
  }

  // NEW: Dynamic permission derivation
  let requiredPermission = item.requiredPermission;
  
  if (!requiredPermission && item.permissionEntity) {
    // Derive permission from entity name
    requiredPermission = derivePermissionFromId(
      item.permissionEntity, 
      item.permissionAction || 'view'
    );
  } else if (!requiredPermission && item.path && !item.children) {
    // Auto-derive from item ID for leaf items with paths
    requiredPermission = derivePermissionFromId(item.id, 'view');
  }

  if (requiredPermission) {
    if (hasActionAccess && !hasActionAccess(requiredPermission)) {
      return false;
    }
  }

  return true;
};
```

### Benefits of Dynamic System

| Benefit | Description |
|---------|-------------|
| **Zero-config for new entities** | Add navigation item → permission auto-derived |
| **Consistent naming** | All permissions follow `<entity>.<action>` pattern |
| **Backward compatible** | `requiredPermission` still works for overrides |
| **Single source of truth** | Navigation structure defines permissions |
| **Easy role assignment** | Just add entity name to role's actions array |

### Example: Adding a New Entity

**Before (Old System)** - 3 file changes:
```typescript
// 1. permissions.ts - Add type
export type PermissionCode = ... | 'customers.view';

// 2. permissions.ts - Add to role
manager: { actions: [..., 'customers.view'] }

// 3. navigation.ts - Add item
{ id: "customers", requiredPermission: "customers.view" }
```

**After (New System)** - 2 file changes:
```typescript
// 1. permissions.ts - Add to role (permission auto-recognized)
manager: { actions: [..., 'customers.view'] }

// 2. navigation.ts - Add item (no requiredPermission needed!)
{ id: "customers", path: "/main-data/customers" }
// Permission "customers.view" is auto-derived from id
```

### Dynamic Permission Registration

For full type safety, we can auto-register permissions:

```typescript
// permissions.ts - Dynamic permission type

// Base known permissions
type BasePermissionCode = 
  | 'accounts.manage' | 'accounts.view'
  | 'transactions.create' | 'transactions.review'
  // ... existing codes

// Dynamic permission pattern (for new entities)
type DynamicPermissionCode = `${string}.view` | `${string}.manage` | `${string}.create`;

// Combined type
export type PermissionCode = BasePermissionCode | DynamicPermissionCode;
```

### Role Assignment with Wildcards (Future Enhancement)

For even more flexibility, support permission wildcards:

```typescript
// Future: Wildcard permissions
manager: {
  actions: [
    'transactions.*',        // All transaction permissions
    'main_data.*.view',      // View all main data entities
  ]
}
```

---

## Permission Matrix Comparison

### New Permission Codes (14 additions)

| New Code | Purpose | Assigned To |
|----------|---------|-------------|
| `transactions.view.own` | View own transactions | accountant, viewer, auditor |
| `transactions.view.all` | View all transactions | auditor, manager, admin |
| `organizations.view` | View organizations | manager, admin |
| `organizations.manage` | Edit organizations | admin |
| `projects.view` | View projects | manager, admin |
| `projects.manage` | Edit projects | admin |
| `cost_centers.view` | View cost centers | manager, admin |
| `cost_centers.manage` | Edit cost centers | admin |
| `work_items.view` | View work items | manager, admin |
| `work_items.manage` | Edit work items | admin |
| `classification.view` | View classifications | manager, admin |
| `classification.manage` | Edit classifications | admin |
| `approvals.view` | See Approvals menu | approver, manager, admin |
| `settings.preferences` | User preferences | ALL ROLES |
| `fiscal.view` | View fiscal dashboard | manager, admin |

### Role Permission Comparison

#### Accountant Role

| Permission | Current | Proposed | Change |
|------------|---------|----------|--------|
| `transactions.create` | ✅ | ✅ | No change |
| `transactions.cost_analysis` | ✅ | ✅ | No change |
| `transaction_line_items.read` | ✅ | ✅ | No change |
| `transactions.review` | ✅ | ✅ | No change |
| `transactions.view.own` | ❌ | ✅ | **ADD** |
| `accounts.view` | ❌ | ✅ | **ADD** |
| `settings.preferences` | ❌ | ✅ | **ADD** |

#### Viewer Role

| Permission | Current | Proposed | Change |
|------------|---------|----------|--------|
| `accounts.view` | ✅ | ✅ | No change |
| `reports.view` | ✅ | ✅ | No change |
| `documents.view` | ✅ | ✅ | No change |
| `sub_tree.view` | ✅ | ✅ | No change |
| `templates.view` | ✅ | ✅ | No change |
| `analysis.view` | ✅ | ✅ | No change |
| `transactions.view.own` | ❌ | ✅ | **ADD** |
| `settings.preferences` | ❌ | ✅ | **ADD** |

#### Auditor Role

| Permission | Current | Proposed | Change |
|------------|---------|----------|--------|
| All viewer permissions | ✅ | ✅ | Inherited |
| `transactions.review` | ✅ | ✅ | No change |
| `settings.audit` | ✅ | ✅ | No change |
| `transactions.view.all` | ❌ | ✅ | **ADD** |

#### Manager Role

| Permission | Current | Proposed | Change |
|------------|---------|----------|--------|
| All accountant + auditor | ✅ | ✅ | Inherited |
| `approvals.review` | ✅ | ✅ | No change |
| `approvals.view` | ❌ | ✅ | **ADD** |
| `organizations.view` | ❌ | ✅ | **ADD** |
| `projects.view` | ❌ | ✅ | **ADD** |
| `fiscal.view` | ❌ | ✅ | **ADD** |

#### Admin Role

| Permission | Current | Proposed | Change |
|------------|---------|----------|--------|
| All manager permissions | ✅ | ✅ | Inherited |
| `users.manage` | ✅ | ✅ | No change |
| `settings.manage` | ✅ | ✅ | No change |
| `organizations.manage` | ❌ | ✅ | **ADD** |
| `projects.manage` | ❌ | ✅ | **ADD** |
| `cost_centers.manage` | ❌ | ✅ | **ADD** |

---

## Navigation Structure Changes

### Main Data Menu

**Current**:
```typescript
{
  id: "main-data",
  requiredPermission: "accounts.view",  // ← REMOVE
  children: [...]
}
```

**Proposed**:
```typescript
{
  id: "main-data",
  // NO requiredPermission - auto-shows if any child visible
  children: [
    { id: "accounts-tree", path: "/main-data/accounts-tree", requiredPermission: "accounts.view" },
    { id: "organizations", path: "/main-data/organizations", requiredPermission: "organizations.view" },
    { id: "projects", path: "/main-data/projects", requiredPermission: "projects.view" },
    { id: "sub-tree", path: "/main-data/sub-tree", requiredPermission: "sub_tree.view" },
    { id: "work-items", path: "/main-data/work-items", requiredPermission: "work_items.view" },
    { id: "cost-centers", path: "/main-data/cost-centers", requiredPermission: "cost_centers.view" },
    { id: "transaction-line-items", path: "/main-data/transaction-line-items", requiredPermission: "transaction_line_items.read" },
    { id: "document-templates", path: "/main-data/document-templates", requiredPermission: "templates.view" },
    { id: "analysis-work-items", path: "/main-data/analysis-work-items", requiredPermission: "analysis.view" },
    { id: "transaction-classification", path: "/main-data/transaction-classification", requiredPermission: "classification.view" },
  ]
}
```

### Transactions Menu

**Current**:
```typescript
{
  id: "transactions",
  children: [
    { id: "my-transactions", requiredPermission: "transactions.read.own" },  // ← BROKEN
    { id: "all-transactions", requiredPermission: "transactions.read.all" }, // ← BROKEN
  ]
}
```

**Proposed**:
```typescript
{
  id: "transactions",
  children: [
    { id: "my-transactions", path: "/transactions/my", requiredPermission: "transactions.view.own" },
    { id: "my-transactions-enriched", path: "/transactions/my-enriched", requiredPermission: "transactions.view.own" },
    { id: "my-lines-enriched", path: "/transactions/my-lines", requiredPermission: "transactions.view.own" },
    { id: "all-transactions", path: "/transactions/all", requiredPermission: "transactions.view.all" },
    { id: "all-transactions-enriched", path: "/transactions/all-enriched", requiredPermission: "transactions.view.all" },
    { id: "all-lines-enriched", path: "/transactions/all-lines", requiredPermission: "transactions.view.all" },
    { id: "pending-transactions", path: "/transactions/pending", requiredPermission: "transactions.review" },
    { id: "assign-cost-analysis", path: "/transactions/assign-cost-analysis", requiredPermission: "transactions.cost_analysis" },
  ]
}
```

### Approvals Menu

**Current**:
```typescript
{
  id: "approvals",
  requiredPermission: "approvals.view",  // ← DOESN'T EXIST
  children: [...]
}
```

**Proposed**:
```typescript
{
  id: "approvals",
  // NO requiredPermission
  children: [
    { id: "approvals-documents", requiredPermission: "approvals.review" },
    { id: "approvals-inbox", requiredPermission: "approvals.review" },
    { id: "approvals-workflows", requiredPermission: "approvals.manage" },
    { id: "approvals-test", requiredPermission: "approvals.manage" },
  ]
}
```

### Settings Menu

**Current**:
```typescript
{
  id: "settings",
  children: [
    { id: "font-preferences", requiredPermission: "settings.preferences" },  // ← DOESN'T EXIST
  ]
}
```

**Proposed**:
```typescript
{
  id: "settings",
  children: [
    { id: "user-management", requiredPermission: "users.view" },
    { id: "online-users", requiredPermission: "presence.view.team" },
    { id: "org-management", requiredPermission: "settings.manage" },
    { id: "font-preferences", requiredPermission: "settings.preferences" },  // ← ALL USERS
    { id: "export-database", requiredPermission: "data.export" },
    { id: "enterprise-audit", requiredPermission: "settings.audit" },
    { id: "diagnostics", superAdminOnly: true },
  ]
}
```

---

## Role Definitions

### Complete Role Matrix (Proposed)

| Role | Dashboard | My Trans. | All Trans. | Accounts Tree | Main Data | Reports | Documents | Approvals | Settings | Fiscal | Inventory |
|------|-----------|-----------|------------|---------------|-----------|---------|-----------|-----------|----------|--------|-----------|
| viewer | ✅ | ✅ | ❌ | ✅ | Partial | ✅ | ✅ | ❌ | Preferences | ❌ | ❌ |
| accountant | ✅ | ✅ | ❌ | ✅ | Partial | ❌ | ❌ | ❌ | Preferences | ❌ | ❌ |
| auditor | ✅ | ✅ | ✅ | ✅ | Full | ✅ | ✅ | ❌ | Audit Log | ❌ | ❌ |
| hr | ✅ | ✅ | ❌ | ✅ | Partial | ✅ | ✅ | ❌ | Online Users | ❌ | ❌ |
| team_leader | ✅ | ✅ | ❌ | ✅ | Partial | ✅ | ✅ | ❌ | Online Users | ❌ | ❌ |
| manager | ✅ | ✅ | ✅ | ✅ | Full | ✅ | ✅ | Review | Full | ✅ View | View Only |
| admin | ✅ | ✅ | ✅ | ✅ | Full | ✅ | ✅ | Full | Full | Full | Full |
| super_admin | ✅ | ✅ | ✅ | ✅ | Full | ✅ | ✅ | Full | Full + Diag | Full | Full |

**Legend**:
- ✅ = Full access
- ❌ = No access
- Partial = Only items with assigned permissions
- Preferences = Font Settings only
- Full = All sub-items

---

## Implementation Roadmap

### Phase 1: Critical Bug Fixes (Day 1)
**Risk**: Low | **Effort**: 2 hours

1. Fix `loading: false` not set after cache hit
2. Prevent cache corruption in background refresh
3. Bump cache version to force fresh load

### Phase 2: Permission Code Expansion (Day 1-2)
**Risk**: Low | **Effort**: 4 hours

1. Add 14 new `PermissionCode` entries
2. Bump `PERMISSION_SCHEMA_VERSION`
3. Update role definitions in MATRIX

### Phase 3: Navigation Cleanup (Day 2-3)
**Risk**: Medium | **Effort**: 6 hours

1. Remove `requiredPermission` from parent menus
2. Update child items with correct permission codes
3. Verify sidebar filtering works correctly

### Phase 4: Testing & Validation (Day 3-4)
**Risk**: Low | **Effort**: 4 hours

1. Test each role's navigation visibility
2. Verify no auth flickering
3. Document any edge cases

### Total Estimated Effort: 16 hours (4 days)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking existing user access | Medium | High | Comprehensive testing per role before deploy |
| Cache migration issues | Low | Medium | Bump cache version, force fresh load |
| Role assignment conflicts in DB | Low | High | Review DB role assignments after deploy |
| Missing permissions edge cases | Medium | Low | Add logging to identify unauthorized access attempts |

---

## Appendix: Complete Permission Codes

### Current Codes (28)

```typescript
// Account Management
'accounts.manage'
'accounts.view'

// Transactions
'transactions.create'
'transactions.review'
'transactions.manage'
'transactions.cost_analysis'

// Reports
'reports.view'
'reports.manage'

// Documents & Templates
'documents.view'
'documents.manage'
'templates.view'
'templates.manage'
'templates.generate'

// Sub Tree & Analysis
'sub_tree.view'
'analysis.view'
'analysis.manage'

// Inventory
'inventory.view'
'inventory.manage'

// Users & Settings
'users.view'
'users.manage'
'settings.manage'
'settings.audit'
'data.export'

// Approvals
'approvals.manage'
'approvals.review'

// Fiscal
'fiscal.manage'

// Presence
'presence.view.org'
'presence.view.team'
'presence.view.all'

// Other
'transaction_line_items.read'
```

### New Codes to Add (14)

```typescript
// Granular Transaction Access
'transactions.view.own'      // View own transactions only
'transactions.view.all'      // View all transactions

// Entity Management
'organizations.view'
'organizations.manage'
'projects.view'
'projects.manage'
'cost_centers.view'
'cost_centers.manage'
'work_items.view'
'work_items.manage'
'classification.view'
'classification.manage'

// Navigation Access
'approvals.view'             // See Approvals menu section

// User Preferences
'settings.preferences'       // Font settings, UI preferences

// Fiscal View
'fiscal.view'                // View fiscal dashboard (separate from fiscal.manage)
```

### Complete Type Definition (Proposed)

```typescript
export type PermissionCode =
  // Accounts
  | 'accounts.manage'
  | 'accounts.view'
  
  // Transactions
  | 'transactions.create'
  | 'transactions.review'
  | 'transactions.manage'
  | 'transactions.cost_analysis'
  | 'transactions.view.own'      // NEW
  | 'transactions.view.all'      // NEW
  
  // Reports
  | 'reports.view'
  | 'reports.manage'
  
  // Documents & Templates
  | 'documents.view'
  | 'documents.manage'
  | 'templates.view'
  | 'templates.manage'
  | 'templates.generate'
  
  // Sub Tree & Analysis
  | 'sub_tree.view'
  | 'analysis.view'
  | 'analysis.manage'
  
  // Inventory
  | 'inventory.view'
  | 'inventory.manage'
  | 'inventory.transfer'         // NEW
  | 'inventory.adjust'           // NEW
  
  // Organizations & Projects
  | 'organizations.view'         // NEW
  | 'organizations.manage'       // NEW
  | 'projects.view'              // NEW
  | 'projects.manage'            // NEW
  
  // Cost Centers & Work Items
  | 'cost_centers.view'          // NEW
  | 'cost_centers.manage'        // NEW
  | 'work_items.view'            // NEW
  | 'work_items.manage'          // NEW
  
  // Classifications
  | 'classification.view'        // NEW
  | 'classification.manage'      // NEW
  
  // Users & Settings
  | 'users.view'
  | 'users.manage'
  | 'settings.manage'
  | 'settings.audit'
  | 'settings.preferences'       // NEW
  | 'data.export'
  
  // Approvals
  | 'approvals.view'             // NEW
  | 'approvals.manage'
  | 'approvals.review'
  
  // Fiscal
  | 'fiscal.view'                // NEW
  | 'fiscal.manage'
  
  // Presence
  | 'presence.view.org'
  | 'presence.view.team'
  | 'presence.view.all'
  
  // Other
  | 'transaction_line_items.read';
```

---

## Document Approval

| Reviewer | Role | Status | Date |
|----------|------|--------|------|
| | Engineering Lead | Pending | |
| | Product Manager | Pending | |
| | Security Lead | Pending | |

---

*End of Document*
