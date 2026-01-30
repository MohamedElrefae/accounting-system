# Phase 13 Execution Plan: Scoped Route Protection & UI Projection
## Implementation Roadmap & Delivery Checklist

**Date:** January 27, 2026  
**Status:** 🟢 READY FOR EXECUTION  
**Priority:** HIGH (Critical Security Path)  
**Duration:** 1.5 - 2 hours  
**Strategy:** Defense-in-Depth (Router Protection + UI Projection)

---

## Executive Overview

Phase 13 implements **context-aware authorization enforcement** across two layers:

1. **🛡️ Router Protection Layer** – URL-level access control preventing unauthorized navigation
2. **👁️ UI Projection Layer** – Dynamic sidebar filtering eliminating dead links and information disclosure

This phase is **prerequisite-complete** (Phase 9 auth hook + Phase 8 RLS policies in place) and ready for immediate execution.

---

## 1. Objective & Scope

### Primary Objective
Enforce strict, context-aware security ensuring users access **only resources matching their granular scoped permissions** (Organization and Project levels).

### Scope Definition

| Category | Item | Status |
|----------|------|--------|
| **In Scope** | Router layer context-aware checks | ✅ Phase 13 |
| **In Scope** | Sidebar dynamic filtering | ✅ Phase 13 |
| **In Scope** | Permission validation logic | ✅ Phase 13 |
| **In Scope** | Audit logging on access attempts | ✅ Phase 13 |
| **Out of Scope** | RLS policy changes | ✅ Completed (Phase 8) |
| **Out of Scope** | Database schema changes | ✅ Completed (Phase 8) |
| **Out of Scope** | Auth hook implementation | ✅ Completed (Phase 9) |
| **Out of Scope** | Token/JWT management | ✅ Completed (Phase 9) |

### Success Criteria (Non-Negotiable)

✅ **URL Parameter Cannot Grant Access** – `/app/org/unauthorized-org-id` returns 403  
✅ **Context-Based Filtering** – Sidebar updates when switching organizations  
✅ **Zero Information Disclosure** – Unauthorized features have zero UI footprint  
✅ **Complete Audit Trail** – All access attempts logged with user/org/result  
✅ **No Broken Links** – Sidebar contains only accessible routes  
✅ **Expired Permissions Blocked** – Time-bound access respected  

---

## 2. Detailed Execution Tasks

### TASK-13.1: Router Protection Layer
#### File: `src/components/routing/OptimizedProtectedRoute.tsx`
#### Objective: Prevent URL-based privilege escalation
#### Estimated Time: 20 minutes

**Current State (Before):**
```typescript
// ❌ PROBLEM: Only checks global roles, ignores context
export const OptimizedProtectedRoute = ({ component: Component, requiredRole }) => {
  const { user } = useAuth();
  
  if (!user.hasRole(requiredRole)) {
    return <Redirect to="/unauthorized" />;
  }
  
  return <Component />;
};
```

**Implementation (After):**
```typescript
import { useParams } from 'react-router-dom';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { logAuthorizationAttempt } from '@/services/auditLogger';

interface ProtectedRouteConfig {
  // Required permission name (e.g., 'manage_users', 'view_reports')
  requiredPermission?: string;
  
  // Scope determines where permission is validated
  // 'global' = global permissions only
  // 'org' = organization context required
  // 'project' = project context required
  // 'org_or_project' = either org or project context acceptable
  scope?: 'global' | 'org' | 'project' | 'org_or_project';
  
  // Fallback destination on permission denial
  fallbackPath?: string;
  
  // Enable audit logging for this route
  auditLog?: boolean;
}

interface OptimizedProtectedRouteProps extends ProtectedRouteConfig {
  component: React.ComponentType<any>;
}

/**
 * ENTERPRISE ROUTE GUARD
 * 
 * Enforces context-aware authorization before rendering protected components.
 * Validates permissions against organization/project context extracted from URL.
 * 
 * Security Model:
 * - Deny by default (authorization must be explicitly granted)
 * - Never trust URL parameters as proof of permission
 * - Always validate against server-verified auth state (RLS-backed)
 * - Log all authorization attempts for audit compliance
 */
export const OptimizedProtectedRoute: React.FC<OptimizedProtectedRouteProps> = ({
  component: Component,
  requiredPermission,
  scope = 'global',
  fallbackPath = '/dashboard',
  auditLog = true,
}) => {
  const navigate = useNavigate();
  
  // Get authenticated user and permission check methods
  const {
    user,
    loading,
    hasGlobalPermission,
    hasPermissionInOrg,
    hasPermissionInProject,
  } = useOptimizedAuth();
  
  // Extract context from URL
  const params = useParams<{
    orgId?: string;
    projectId?: string;
    resourceId?: string;
  }>();
  
  // ============================================================
  // PHASE 1: AUTHENTICATION CHECK (Identity)
  // ============================================================
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    // Not authenticated → redirect to login
    return <Redirect to={`/login?returnTo=${window.location.pathname}`} />;
  }
  
  // ============================================================
  // PHASE 2: AUTHORIZATION CHECK (Permissions)
  // ============================================================
  
  let isAuthorized = false;
  let denialReason = '';
  
  // Public routes (no permission required)
  if (!requiredPermission) {
    isAuthorized = true;
  } else {
    // Permission is required; check against appropriate scope
    switch (scope) {
      // GLOBAL SCOPE: Permission must exist at tenant level
      case 'global': {
        isAuthorized = hasGlobalPermission(requiredPermission);
        denialReason = isAuthorized
          ? ''
          : `Missing global permission: "${requiredPermission}"`;
        break;
      }
      
      // ORG SCOPE: Permission must exist within specific organization
      case 'org': {
        if (!params.orgId) {
          isAuthorized = false;
          denialReason = 'Organization context required but not provided in URL';
          break;
        }
        
        isAuthorized = hasPermissionInOrg(params.orgId, requiredPermission);
        denialReason = isAuthorized
          ? ''
          : `Missing permission "${requiredPermission}" in organization ${params.orgId}`;
        break;
      }
      
      // PROJECT SCOPE: Permission must exist within specific project
      case 'project': {
        if (!params.projectId) {
          isAuthorized = false;
          denialReason = 'Project context required but not provided in URL';
          break;
        }
        
        if (!params.orgId) {
          isAuthorized = false;
          denialReason = 'Organization context required (parent of project)';
          break;
        }
        
        isAuthorized = hasPermissionInProject(params.projectId, requiredPermission);
        denialReason = isAuthorized
          ? ''
          : `Missing permission "${requiredPermission}" in project ${params.projectId}`;
        break;
      }
      
      // ORG_OR_PROJECT SCOPE: Accept either org or project context
      case 'org_or_project': {
        if (params.projectId) {
          isAuthorized = hasPermissionInProject(params.projectId, requiredPermission);
          if (!isAuthorized) {
            denialReason = `Missing permission "${requiredPermission}" in project ${params.projectId}`;
          }
        } else if (params.orgId) {
          isAuthorized = hasPermissionInOrg(params.orgId, requiredPermission);
          if (!isAuthorized) {
            denialReason = `Missing permission "${requiredPermission}" in organization ${params.orgId}`;
          }
        } else {
          isAuthorized = false;
          denialReason = 'Organization or Project context required';
        }
        break;
      }
      
      default:
        isAuthorized = false;
        denialReason = `Unknown scope: ${scope}`;
    }
  }
  
  // ============================================================
  // PHASE 3: AUDIT LOGGING
  // ============================================================
  if (auditLog && requiredPermission) {
    logAuthorizationAttempt({
      userId: user.id,
      userEmail: user.email,
      requiredPermission,
      scope,
      orgId: params.orgId || null,
      projectId: params.projectId || null,
      granted: isAuthorized,
      denialReason: denialReason || null,
      timestamp: new Date().toISOString(),
      pathname: window.location.pathname,
    });
  }
  
  // ============================================================
  // PHASE 4: DECISION & RESPONSE
  // ============================================================
  
  if (!isAuthorized) {
    console.warn(
      `[Auth] Access Denied: User ${user.id} attempted ${scope} access to "${requiredPermission}". Reason: ${denialReason}`,
    );
    
    // Redirect to fallback (typically /unauthorized or /dashboard)
    return (
      <AccessDeniedPage
        reason={denialReason}
        fallbackPath={fallbackPath}
        onRedirect={() => navigate(fallbackPath)}
      />
    );
  }
  
  // Authorization successful; render the protected component
  return <Component />;
};

// ============================================================
// SUPPORTING COMPONENT: Access Denied Page
// ============================================================
interface AccessDeniedPageProps {
  reason: string;
  fallbackPath: string;
  onRedirect?: () => void;
}

const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  reason,
  fallbackPath,
  onRedirect,
}) => {
  const navigate = useNavigate();
  
  const handleRedirect = () => {
    onRedirect?.();
    navigate(fallbackPath);
  };
  
  return (
    <div className="access-denied-container">
      <div className="access-denied-card">
        <h1>🔒 Access Denied</h1>
        <p className="reason">{reason || 'You do not have permission to access this resource.'}</p>
        <p className="hint">If you believe this is an error, please contact your administrator.</p>
        <button onClick={handleRedirect} className="btn btn-primary">
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default OptimizedProtectedRoute;
```

**Verification Checklist for TASK-13.1:**
- [ ] Unauthenticated user → redirected to `/login`
- [ ] Authenticated user without permission → 403 page shown
- [ ] Authenticated user with global permission → component renders
- [ ] User with org permission in Org A → can access `/app/org/A/*`
- [ ] User without permission in Org B → accessing `/app/org/B/*` returns 403
- [ ] Expired time-bound permission → access denied
- [ ] Audit log contains: userId, permission, scope, orgId, granted boolean
- [ ] Denial reason includes specific missing permission in audit log

---

### TASK-13.2: UI Projection Layer
#### File: `src/components/layout/Sidebar.tsx`
#### Objective: Eliminate dead links by filtering UI based on permissions
#### Estimated Time: 30 minutes

**Current State (Before):**
```typescript
// ❌ PROBLEM: Shows all menu items regardless of permission
const navigationItems = [
  { label: 'Members', path: '/org/:orgId/members' },
  { label: 'Settings', path: '/org/:orgId/settings' },
  { label: 'Billing', path: '/billing' },
];

export const Sidebar = () => {
  return (
    <nav>
      {navigationItems.map(item => (
        <a href={item.path}>{item.label}</a>
      ))}
    </nav>
  );
};
```

**Implementation (After):**
```typescript
import React, { useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import './Sidebar.css';

/**
 * Navigation Item Configuration
 * 
 * Each item specifies permission requirements for visibility.
 * Items without permission requirements are always visible (public).
 */
interface NavItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
  
  // Permission requirements for visibility
  globalPermission?: string; // Required global permission (e.g., 'view_billing')
  contextPermission?: string; // Required org/project permission (e.g., 'org:manage_users')
  
  // Nested items (sub-menu)
  children?: NavItem[];
  
  // Optional badge for admin routes
  adminOnly?: boolean;
  
  // Whether to render as divider
  isDivider?: boolean;
}

/**
 * NAVIGATION CONFIGURATION
 * 
 * Define all possible navigation items with their permission requirements.
 * This is the single source of truth for sidebar visibility rules.
 * 
 * Example permission naming conventions:
 * - Global: 'view_billing', 'manage_users'
 * - Org-scoped: 'org:manage_settings', 'org:view_members'
 * - Project-scoped: 'project:manage_tasks', 'project:view_analytics'
 */
const navigationConfig: NavItem[] = [
  // PUBLIC SECTION (always visible)
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/app/dashboard',
    icon: <DashboardIcon />,
    // No permission required = public
  },
  
  {
    id: 'projects-divider',
    isDivider: true,
  },
  
  // ORGANIZATION SECTION (context-aware)
  {
    id: 'org-section',
    label: 'Organization',
    path: '', // Section header, no direct navigation
    icon: <OrgIcon />,
    children: [
      {
        id: 'org-overview',
        label: 'Overview',
        path: '/app/org/:orgId/overview',
        // No permission required; all org members see overview
      },
      {
        id: 'org-members',
        label: 'Members',
        path: '/app/org/:orgId/members',
        contextPermission: 'org:view_members',
      },
      {
        id: 'org-settings',
        label: 'Settings',
        path: '/app/org/:orgId/settings',
        contextPermission: 'org:manage_settings',
        adminOnly: true,
      },
      {
        id: 'org-billing',
        label: 'Billing & Usage',
        path: '/app/org/:orgId/billing',
        contextPermission: 'org:manage_billing',
        adminOnly: true,
      },
    ],
  },
  
  {
    id: 'projects-divider2',
    isDivider: true,
  },
  
  // PROJECT SECTION (nested context-aware)
  {
    id: 'project-section',
    label: 'Current Project',
    path: '',
    icon: <ProjectIcon />,
    children: [
      {
        id: 'project-board',
        label: 'Project Board',
        path: '/app/org/:orgId/project/:projectId/board',
        contextPermission: 'project:view_tasks',
      },
      {
        id: 'project-members',
        label: 'Team',
        path: '/app/org/:orgId/project/:projectId/team',
        contextPermission: 'project:view_members',
      },
      {
        id: 'project-settings',
        label: 'Project Settings',
        path: '/app/org/:orgId/project/:projectId/settings',
        contextPermission: 'project:manage_settings',
      },
    ],
  },
  
  {
    id: 'admin-divider',
    isDivider: true,
  },
  
  // GLOBAL ADMIN SECTION
  {
    id: 'global-admin',
    label: 'Global Admin',
    path: '',
    icon: <AdminIcon />,
    adminOnly: true,
    children: [
      {
        id: 'system-users',
        label: 'System Users',
        path: '/app/admin/users',
        globalPermission: 'manage_users',
      },
      {
        id: 'system-orgs',
        label: 'Organizations',
        path: '/app/admin/organizations',
        globalPermission: 'manage_organizations',
      },
      {
        id: 'audit-logs',
        label: 'Audit Logs',
        path: '/app/admin/audit-logs',
        globalPermission: 'view_audit_logs',
      },
    ],
  },
];

/**
 * SIDEBAR COMPONENT
 * 
 * Dynamically filters navigation items based on user permissions.
 * Updates in real-time when organization/project context changes.
 * Ensures zero information disclosure (hidden items = zero UI footprint).
 */
export const Sidebar: React.FC = () => {
  const { user, hasGlobalPermission, hasPermissionInOrg, hasPermissionInProject } =
    useOptimizedAuth();
  const params = useParams<{ orgId?: string; projectId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  /**
   * FILTER LOGIC
   * 
   * For each navigation item, determine visibility based on:
   * 1. No permission requirement → Always visible
   * 2. Global permission required → Check user's global permissions
   * 3. Org permission required → Check user's org-scoped permissions
   * 4. Project permission required → Check user's project-scoped permissions
   * 
   * If ANY permission check fails, item is completely hidden (not disabled).
   */
  const filterNavigationItems = (items: NavItem[]): NavItem[] => {
    return items
      .filter((item) => {
        // Dividers are always shown
        if (item.isDivider) {
          return true;
        }
        
        // If no permission requirement, item is always visible
        if (!item.globalPermission && !item.contextPermission) {
          return true;
        }
        
        // CHECK: Global permission requirement
        if (item.globalPermission) {
          if (!hasGlobalPermission(item.globalPermission)) {
            return false; // Hidden from UI
          }
        }
        
        // CHECK: Context permission requirement
        if (item.contextPermission) {
          // Determine which context to check against
          if (params.projectId) {
            // Project context takes precedence
            if (!hasPermissionInProject(params.projectId, item.contextPermission)) {
              return false; // Hidden from UI
            }
          } else if (params.orgId) {
            // Fall back to org context
            if (!hasPermissionInOrg(params.orgId, item.contextPermission)) {
              return false; // Hidden from UI
            }
          } else {
            // No context available; hide context-required items
            return false;
          }
        }
        
        // All permission checks passed; item is visible
        return true;
      })
      .map((item) => ({
        ...item,
        // Recursively filter sub-items (children)
        children: item.children ? filterNavigationItems(item.children) : undefined,
      }))
      // Remove empty sections (sections with no visible children)
      .filter((item) => {
        if (item.children && item.children.length === 0 && !item.isDivider) {
          return false; // Hide empty sections
        }
        return true;
      });
  };
  
  // Memoize filtered items; recompute only when permissions/params change
  const visibleItems = useMemo(
    () => filterNavigationItems(navigationConfig),
    [user, params.orgId, params.projectId],
  );
  
  /**
   * RENDER LOGIC
   * 
   * Recursively render filtered navigation items with active state highlighting.
   */
  const renderNavItems = (items: NavItem[], depth = 0) => {
    return items.map((item) => {
      if (item.isDivider) {
        return <div key={item.id} className="nav-divider" />;
      }
      
      // Interpolate URL parameters into path
      const interpolatedPath = item.path
        .replace(':orgId', params.orgId || '')
        .replace(':projectId', params.projectId || '');
      
      const isActive = location.pathname === interpolatedPath;
      
      return (
        <div key={item.id} className={`nav-item-wrapper depth-${depth}`}>
          {/* Main nav item */}
          <a
            href={interpolatedPath}
            onClick={(e) => {
              e.preventDefault();
              navigate(interpolatedPath);
            }}
            className={`nav-item ${isActive ? 'active' : ''}`}
            data-testid={`nav-item-${item.id}`}
          >
            {item.icon && <span className="nav-icon">{item.icon}</span>}
            <span className="nav-label">{item.label}</span>
            {item.adminOnly && <span className="badge-admin">👑</span>}
            {item.children && item.children.length > 0 && (
              <span className="nav-chevron">›</span>
            )}
          </a>
          
          {/* Nested items (sub-menu) */}
          {item.children && item.children.length > 0 && (
            <div className="nav-children">
              {renderNavItems(item.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };
  
  return (
    <aside className="sidebar" role="navigation" aria-label="Main navigation">
      <div className="sidebar-header">
        <h2>Navigation</h2>
        {params.orgId && (
          <p className="sidebar-context">Org: {params.orgId}</p>
        )}
        {params.projectId && (
          <p className="sidebar-context">Project: {params.projectId}</p>
        )}
      </div>
      
      <nav className="sidebar-nav">
        {visibleItems.length > 0 ? (
          renderNavItems(visibleItems)
        ) : (
          <p className="no-items-message">No accessible items</p>
        )}
      </nav>
      
      <div className="sidebar-footer">
        <div className="user-info">
          <span className="user-email">{user?.email}</span>
          <a href="#" onClick={() => navigate('/logout')} className="logout-link">
            Sign Out
          </a>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
```

**Styling (Sidebar.css):**
```css
.sidebar {
  width: 280px;
  height: 100vh;
  background-color: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 0;
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg-elevated);
}

.sidebar-header h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: var(--color-text-primary);
}

.sidebar-context {
  margin: 0.5rem 0 0 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.sidebar-nav {
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
}

.nav-item-wrapper {
  position: relative;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all var(--duration-normal) var(--ease-standard);
  cursor: pointer;
  font-size: 0.875rem;
}

.nav-item:hover {
  background-color: var(--color-secondary-hover);
  color: var(--color-text-primary);
}

.nav-item.active {
  background-color: var(--color-secondary);
  color: var(--color-text-primary);
  font-weight: 500;
  border-left: 3px solid var(--color-primary);
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-chevron {
  font-size: 1rem;
  color: var(--color-text-muted);
  transform: rotate(0deg);
  transition: transform var(--duration-fast) var(--ease-standard);
}

.nav-item-wrapper.open .nav-chevron {
  transform: rotate(90deg);
}

.nav-children {
  background-color: var(--color-bg-muted);
  border-left: 2px solid var(--color-border);
}

.depth-1 .nav-item {
  padding-left: 1.5rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.nav-divider {
  height: 1px;
  background-color: var(--color-border);
  margin: 0.5rem 1rem;
}

.badge-admin {
  font-size: 0.75rem;
  margin-left: auto;
  flex-shrink: 0;
}

.no-items-message {
  padding: 1.5rem 1rem;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  text-align: center;
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid var(--color-border);
  background-color: var(--color-bg-elevated);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-email {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  word-break: break-all;
}

.logout-link {
  font-size: 0.8125rem;
  color: var(--color-primary);
  text-decoration: none;
  transition: color var(--duration-fast);
}

.logout-link:hover {
  color: var(--color-primary-hover);
}
```

**Verification Checklist for TASK-13.2:**
- [ ] Org Admin sees "Members", "Settings", "Billing & Usage" under Organization
- [ ] Org Viewer does NOT see "Settings" or "Billing & Usage" in sidebar
- [ ] User without project context does NOT see "Current Project" section
- [ ] User with project context sees project-scoped menu items
- [ ] Switching from Org A → Org B updates sidebar instantly
- [ ] No empty sections visible (sections with all children hidden are removed)
- [ ] Active route highlighted in sidebar with visual indicator
- [ ] Dividers present and correctly separated
- [ ] "Global Admin" section only visible to super_admin users

---

### TASK-13.3: Apply Route Guards
#### Files: `src/routes/AdminRoutes.tsx`, `src/routes/CoreRoutes.tsx`
#### Objective: Map specific permissions to all sensitive routes
#### Estimated Time: 15 minutes

**Current State (Before):**
```typescript
// ❌ PROBLEM: Routes unprotected; no permission mapping
<Route path="/org/:orgId/settings" element={<OrgSettings />} />
<Route path="/org/:orgId/members" element={<OrgMembers />} />
```

**Implementation (After):**
```typescript
import { OptimizedProtectedRoute } from '@/components/routing/OptimizedProtectedRoute';

/**
 * CORE APPLICATION ROUTES
 * 
 * All routes mapped with:
 * 1. Required permission(s)
 * 2. Scope (global, org, project)
 * 3. Fallback path on denial
 * 
 * Routes are organized by context level:
 * - Global routes (billing, admin, system)
 * - Organization-scoped routes (org settings, members)
 * - Project-scoped routes (tasks, analytics, team)
 */

export const CoreRoutes = () => {
  return (
    <Routes>
      {/* ============================================================
          PUBLIC ROUTES (No protection)
          ============================================================ */}
      
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      
      {/* ============================================================
          APP SHELL (Protected at shell level)
          ============================================================ */}
      
      <Route
        path="/app"
        element={
          <OptimizedProtectedRoute
            component={AppShell}
            // No specific permission required; auth check only
            scope="global"
          />
        }
      >
        {/* ========== DASHBOARD (Public within app) ========== */}
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* ========== GLOBAL ROUTES (Cross-tenant) ========== */}
        
        <Route
          path="billing"
          element={
            <OptimizedProtectedRoute
              component={BillingDashboard}
              requiredPermission="view_billing"
              scope="global"
              fallbackPath="/app/dashboard"
              auditLog={true}
            />
          }
        />
        
        <Route
          path="admin"
          element={
            <OptimizedProtectedRoute
              component={AdminPanel}
              requiredPermission="super_admin"
              scope="global"
              fallbackPath="/app/dashboard"
              auditLog={true}
            />
          }
        >
          <Route path="users" element={<SystemUserManagement />} />
          <Route path="organizations" element={<OrganizationManagement />} />
          <Route path="audit-logs" element={<AuditLogViewer />} />
        </Route>
        
        {/* ========== ORGANIZATION ROUTES ========== */}
        
        <Route path="org/:orgId">
          {/* Overview: Accessible to all org members */}
          <Route
            path="overview"
            element={
              <OptimizedProtectedRoute
                component={OrgOverview}
                // No permission required; membership sufficient
                scope="org"
                fallbackPath="/app/dashboard"
                auditLog={true}
              />
            }
          />
          
          {/* Members: Requires view_members permission */}
          <Route
            path="members"
            element={
              <OptimizedProtectedRoute
                component={OrgMembers}
                requiredPermission="org:view_members"
                scope="org"
                fallbackPath="/app/dashboard"
                auditLog={true}
              />
            }
          />
          
          {/* Settings: Requires manage_settings permission (admin only) */}
          <Route
            path="settings"
            element={
              <OptimizedProtectedRoute
                component={OrgSettings}
                requiredPermission="org:manage_settings"
                scope="org"
                fallbackPath="/app/org/:orgId/overview"
                auditLog={true}
              />
            }
          />
          
          {/* Billing: Requires manage_billing permission (finance/admin) */}
          <Route
            path="billing"
            element={
              <OptimizedProtectedRoute
                component={OrgBilling}
                requiredPermission="org:manage_billing"
                scope="org"
                fallbackPath="/app/org/:orgId/overview"
                auditLog={true}
              />
            }
          />
          
          {/* Reports: Requires view_reports permission */}
          <Route
            path="reports"
            element={
              <OptimizedProtectedRoute
                component={OrgReports}
                requiredPermission="org:view_reports"
                scope="org"
                fallbackPath="/app/org/:orgId/overview"
                auditLog={true}
              />
            }
          />
          
          {/* ========== PROJECT ROUTES (Nested under org) ========== */}
          
          <Route path="project/:projectId">
            {/* Project Board: Requires view_tasks permission */}
            <Route
              path="board"
              element={
                <OptimizedProtectedRoute
                  component={ProjectBoard}
                  requiredPermission="project:view_tasks"
                  scope="project"
                  fallbackPath="/app/org/:orgId/overview"
                  auditLog={true}
                />
              }
            />
            
            {/* Project Team: Requires view_members permission */}
            <Route
              path="team"
              element={
                <OptimizedProtectedRoute
                  component={ProjectTeam}
                  requiredPermission="project:view_members"
                  scope="project"
                  fallbackPath="/app/org/:orgId/overview"
                  auditLog={true}
                />
              }
            />
            
            {/* Project Settings: Requires manage_settings permission */}
            <Route
              path="settings"
              element={
                <OptimizedProtectedRoute
                  component={ProjectSettings}
                  requiredPermission="project:manage_settings"
                  scope="project"
                  fallbackPath="/app/org/:orgId/project/:projectId/board"
                  auditLog={true}
                />
              }
            />
            
            {/* Project Analytics: Requires view_analytics permission */}
            <Route
              path="analytics"
              element={
                <OptimizedProtectedRoute
                  component={ProjectAnalytics}
                  requiredPermission="project:view_analytics"
                  scope="project"
                  fallbackPath="/app/org/:orgId/project/:projectId/board"
                  auditLog={true}
                />
              }
            />
          </Route>
        </Route>
        
        {/* ========== CATCH-ALL: Unknown routes ========== */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

/**
 * PERMISSION MAPPING REFERENCE
 * 
 * This table documents every protected route and its permission requirement.
 * Keep this updated when adding/removing routes.
 * 
 * Route | Permission | Scope | Users |
 * ------|------------|-------|-------|
 * /app/billing | view_billing | global | Super Admin, System Accountant |
 * /app/admin/* | super_admin | global | Super Admin only |
 * /app/org/:orgId/settings | org:manage_settings | org | Org Admin |
 * /app/org/:orgId/members | org:view_members | org | Org Admin, Org Accountant |
 * /app/org/:orgId/billing | org:manage_billing | org | Org Admin, Org Accountant |
 * /app/org/:orgId/reports | org:view_reports | org | Org Admin, Org Accountant, Org Viewer |
 * /app/org/:orgId/project/:projectId/board | project:view_tasks | project | Project Lead, Project Contributor, Project Viewer |
 * /app/org/:orgId/project/:projectId/settings | project:manage_settings | project | Project Lead |
 * /app/org/:orgId/project/:projectId/analytics | project:view_analytics | project | Project Lead, Project Contributor |
 */

export default CoreRoutes;
```

**Verification Checklist for TASK-13.3:**
- [ ] Every route with sensitive data has `OptimizedProtectedRoute` wrapper
- [ ] `requiredPermission` specified for all admin/settings routes
- [ ] `scope` correctly set to 'global', 'org', or 'project'
- [ ] Fallback paths are appropriate (not circular)
- [ ] Audit logging enabled for all protection layers
- [ ] Route configuration matches Navigation configuration (parity check)
- [ ] Public routes (dashboard, overview) have no permission requirement
- [ ] Project routes require both orgId and projectId URL params

---

### TASK-13.4: Verification & Testing
#### Objective: Validate implementation across all scenarios
#### Estimated Time: 20 minutes

#### 4.1 Automated Testing Suite

**Test File: `src/components/routing/__tests__/OptimizedProtectedRoute.test.tsx`**

```typescript
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { OptimizedProtectedRoute } from '../OptimizedProtectedRoute';
import { AuthProvider } from '@/context/AuthContext';

/**
 * Test Suite: OptimizedProtectedRoute
 * 
 * Covers all authorization scenarios and edge cases.
 */

describe('OptimizedProtectedRoute', () => {
  // Test Component
  const TestComponent = () => <div>Protected Content</div>;
  
  // ============================================================
  // AUTHENTICATION TESTS
  // ============================================================
  
  describe('Authentication (Identity)', () => {
    it('should redirect unauthenticated users to login', () => {
      render(
        <MemoryRouter initialEntries={['/app/test']}>
          <AuthProvider user={null}>
            <Routes>
              <Route
                path="/app/test"
                element={
                  <OptimizedProtectedRoute
                    component={TestComponent}
                    requiredPermission="test_permission"
                  />
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );
      
      expect(screen.getByText(/login/i)).toBeInTheDocument();
    });
  });
  
  // ============================================================
  // GLOBAL PERMISSION TESTS
  // ============================================================
  
  describe('Global Scope Authorization', () => {
    it('should allow access with required global permission', () => {
      const mockUser = {
        id: 'user-1',
        globalPermissions: {
          role: 'super_admin',
          permissions: new Set(['view_billing']),
        },
      };
      
      render(
        <MemoryRouter initialEntries={['/app/billing']}>
          <AuthProvider user={mockUser}>
            <Routes>
              <Route
                path="/app/billing"
                element={
                  <OptimizedProtectedRoute
                    component={TestComponent}
                    requiredPermission="view_billing"
                    scope="global"
                  />
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
    
    it('should deny access without required global permission', () => {
      const mockUser = {
        id: 'user-2',
        globalPermissions: {
          role: 'viewer',
          permissions: new Set([]),
        },
      };
      
      render(
        <MemoryRouter initialEntries={['/app/billing']}>
          <AuthProvider user={mockUser}>
            <Routes>
              <Route
                path="/app/billing"
                element={
                  <OptimizedProtectedRoute
                    component={TestComponent}
                    requiredPermission="view_billing"
                    scope="global"
                  />
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );
      
      expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });
  
  // ============================================================
  // ORG-SCOPED PERMISSION TESTS
  // ============================================================
  
  describe('Organization Scope Authorization', () => {
    it('should allow access to org route with required org permission', () => {
      const mockUser = {
        id: 'user-3',
        orgPermissions: [
          {
            orgId: 'org-123',
            role: 'org_admin',
            permissions: new Set(['org:manage_settings']),
          },
        ],
      };
      
      render(
        <MemoryRouter initialEntries={['/app/org/org-123/settings']}>
          <AuthProvider user={mockUser}>
            <Routes>
              <Route
                path="/app/org/:orgId/settings"
                element={
                  <OptimizedProtectedRoute
                    component={TestComponent}
                    requiredPermission="org:manage_settings"
                    scope="org"
                  />
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
    
    it('should deny access to org route without org permission', () => {
      const mockUser = {
        id: 'user-4',
        orgPermissions: [
          {
            orgId: 'org-456',
            role: 'org_viewer',
            permissions: new Set(['org:view_reports']),
          },
        ],
      };
      
      render(
        <MemoryRouter initialEntries={['/app/org/org-456/settings']}>
          <AuthProvider user={mockUser}>
            <Routes>
              <Route
                path="/app/org/:orgId/settings"
                element={
                  <OptimizedProtectedRoute
                    component={TestComponent}
                    requiredPermission="org:manage_settings"
                    scope="org"
                  />
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );
      
      expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    });
    
    it('should prevent privilege escalation across orgs', () => {
      const mockUser = {
        id: 'user-5',
        orgPermissions: [
          {
            orgId: 'org-authorized',
            role: 'org_admin',
            permissions: new Set(['org:manage_settings']),
          },
          // User has NO access to org-unauthorized
        ],
      };
      
      render(
        <MemoryRouter initialEntries={['/app/org/org-unauthorized/settings']}>
          <AuthProvider user={mockUser}>
            <Routes>
              <Route
                path="/app/org/:orgId/settings"
                element={
                  <OptimizedProtectedRoute
                    component={TestComponent}
                    requiredPermission="org:manage_settings"
                    scope="org"
                  />
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );
      
      expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });
  
  // ============================================================
  // PROJECT-SCOPED PERMISSION TESTS
  // ============================================================
  
  describe('Project Scope Authorization', () => {
    it('should allow access to project route with required project permission', () => {
      const mockUser = {
        id: 'user-6',
        projectPermissions: [
          {
            projectId: 'proj-789',
            orgId: 'org-123',
            role: 'project_lead',
            permissions: new Set(['project:manage_settings']),
          },
        ],
      };
      
      render(
        <MemoryRouter initialEntries={['/app/org/org-123/project/proj-789/settings']}>
          <AuthProvider user={mockUser}>
            <Routes>
              <Route
                path="/app/org/:orgId/project/:projectId/settings"
                element={
                  <OptimizedProtectedRoute
                    component={TestComponent}
                    requiredPermission="project:manage_settings"
                    scope="project"
                  />
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
    
    it('should deny access without project context in URL', () => {
      const mockUser = {
        id: 'user-7',
        projectPermissions: [
          {
            projectId: 'proj-789',
            orgId: 'org-123',
            role: 'project_lead',
            permissions: new Set(['project:manage_settings']),
          },
        ],
      };
      
      render(
        <MemoryRouter initialEntries={['/app/org/org-123/settings']}>
          <AuthProvider user={mockUser}>
            <Routes>
              <Route
                path="/app/org/:orgId/settings"
                element={
                  <OptimizedProtectedRoute
                    component={TestComponent}
                    requiredPermission="project:manage_settings"
                    scope="project"
                  />
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );
      
      expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    });
  });
  
  // ============================================================
  // TIME-BOUND PERMISSION TESTS
  // ============================================================
  
  describe('Time-Bound Permission Expiration', () => {
    it('should deny access if org permission is expired', () => {
      const mockUser = {
        id: 'user-8',
        orgPermissions: [
          {
            orgId: 'org-123',
            role: 'org_admin',
            permissions: new Set(['org:manage_settings']),
            expiresAt: new Date(Date.now() - 1000), // 1 second ago
          },
        ],
      };
      
      render(
        <MemoryRouter initialEntries={['/app/org/org-123/settings']}>
          <AuthProvider user={mockUser}>
            <Routes>
              <Route
                path="/app/org/:orgId/settings"
                element={
                  <OptimizedProtectedRoute
                    component={TestComponent}
                    requiredPermission="org:manage_settings"
                    scope="org"
                  />
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );
      
      expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    });
    
    it('should allow access if permission expiration is in future', () => {
      const mockUser = {
        id: 'user-9',
        orgPermissions: [
          {
            orgId: 'org-123',
            role: 'org_admin',
            permissions: new Set(['org:manage_settings']),
            expiresAt: new Date(Date.now() + 60000), // 1 minute from now
          },
        ],
      };
      
      render(
        <MemoryRouter initialEntries={['/app/org/org-123/settings']}>
          <AuthProvider user={mockUser}>
            <Routes>
              <Route
                path="/app/org/:orgId/settings"
                element={
                  <OptimizedProtectedRoute
                    component={TestComponent}
                    requiredPermission="org:manage_settings"
                    scope="org"
                  />
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
  
  // ============================================================
  // AUDIT LOGGING TESTS
  // ============================================================
  
  describe('Audit Logging', () => {
    it('should log successful authorization attempt', () => {
      const logSpy = jest.spyOn(console, 'warn');
      
      const mockUser = {
        id: 'user-10',
        globalPermissions: {
          role: 'super_admin',
          permissions: new Set(['view_billing']),
        },
      };
      
      render(
        <MemoryRouter initialEntries={['/app/billing']}>
          <AuthProvider user={mockUser}>
            <Routes>
              <Route
                path="/app/billing"
                element={
                  <OptimizedProtectedRoute
                    component={TestComponent}
                    requiredPermission="view_billing"
                    scope="global"
                    auditLog={true}
                  />
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );
      
      // Successful auth should NOT produce warnings
      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });
    
    it('should log failed authorization attempt', () => {
      const logSpy = jest.spyOn(console, 'warn');
      
      const mockUser = {
        id: 'user-11',
        globalPermissions: {
          role: 'viewer',
          permissions: new Set([]),
        },
      };
      
      render(
        <MemoryRouter initialEntries={['/app/billing']}>
          <AuthProvider user={mockUser}>
            <Routes>
              <Route
                path="/app/billing"
                element={
                  <OptimizedProtectedRoute
                    component={TestComponent}
                    requiredPermission="view_billing"
                    scope="global"
                    auditLog={true}
                  />
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Access Denied'),
      );
      logSpy.mockRestore();
    });
  });
});
```

**Test File: `src/components/layout/__tests__/Sidebar.test.tsx`**

```typescript
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { AuthProvider } from '@/context/AuthContext';

describe('Sidebar Navigation Filtering', () => {
  it('should show only accessible items for org viewer', () => {
    const mockUser = {
      id: 'user-1',
      orgPermissions: [
        {
          orgId: 'org-123',
          role: 'org_viewer',
          permissions: new Set(['org:view_reports']),
        },
      ],
    };
    
    render(
      <MemoryRouter initialEntries={['/app/org/org-123/overview']}>
        <AuthProvider user={mockUser}>
          <Sidebar />
        </AuthProvider>
      </MemoryRouter>,
    );
    
    // Visible items
    expect(screen.getByTestId('nav-item-org-overview')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-org-members')).toBeInTheDocument();
    
    // Hidden items (not in DOM)
    expect(screen.queryByTestId('nav-item-org-settings')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-item-org-billing')).not.toBeInTheDocument();
  });
  
  it('should show all org items for org admin', () => {
    const mockUser = {
      id: 'user-2',
      orgPermissions: [
        {
          orgId: 'org-123',
          role: 'org_admin',
          permissions: new Set([
            'org:view_members',
            'org:manage_settings',
            'org:manage_billing',
          ]),
        },
      ],
    };
    
    render(
      <MemoryRouter initialEntries={['/app/org/org-123/overview']}>
        <AuthProvider user={mockUser}>
          <Sidebar />
        </AuthProvider>
      </MemoryRouter>,
    );
    
    expect(screen.getByTestId('nav-item-org-overview')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-org-members')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-org-settings')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-org-billing')).toBeInTheDocument();
  });
  
  it('should show admin section only to super admin', () => {
    const mockUserViewer = {
      id: 'user-3',
      globalPermissions: {
        role: 'viewer',
        permissions: new Set([]),
      },
    };
    
    const { rerender } = render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <AuthProvider user={mockUserViewer}>
          <Sidebar />
        </AuthProvider>
      </MemoryRouter>,
    );
    
    // Viewer should NOT see admin section
    expect(screen.queryByTestId('nav-item-global-admin')).not.toBeInTheDocument();
    
    // Now render with super admin
    const mockUserAdmin = {
      id: 'user-4',
      globalPermissions: {
        role: 'super_admin',
        permissions: new Set(['manage_users', 'manage_organizations']),
      },
    };
    
    rerender(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <AuthProvider user={mockUserAdmin}>
          <Sidebar />
        </AuthProvider>
      </MemoryRouter>,
    );
    
    // Admin should see admin section
    expect(screen.getByTestId('nav-item-global-admin')).toBeInTheDocument();
  });
});
```

#### 4.2 Manual Acceptance Testing Scenarios

**Test Scenario A: Authorized Org Admin – Full Access**

```
Setup:
- User: Alice (alice@example.com)
- Role: Org Admin in Org-123
- Permissions: org:manage_settings, org:view_members, org:manage_billing

Steps:
1. Log in as Alice
2. Navigate to /app/org/org-123
3. Verify sidebar shows:
   ✅ Organization > Overview
   ✅ Organization > Members
   ✅ Organization > Settings
   ✅ Organization > Billing & Usage
   ✅ Organization > Reports

Actions:
4. Click "Settings" → Should navigate to /app/org/org-123/settings
5. Verify content loads: "Organization Settings"
6. Click "Billing & Usage" → Should navigate to /app/org/org-123/billing
7. Verify content loads: "Billing & Usage"

Result: ✅ PASS
Evidence: All authorized routes accessible; no 403 errors
```

**Test Scenario B: Unauthorized Org Viewer – Restricted Access**

```
Setup:
- User: Bob (bob@example.com)
- Role: Org Viewer in Org-123
- Permissions: org:view_members, org:view_reports (ONLY)

Steps:
1. Log in as Bob
2. Navigate to /app/org/org-123
3. Verify sidebar shows:
   ✅ Organization > Overview
   ✅ Organization > Members
   ✅ Organization > Reports
   ❌ Organization > Settings (HIDDEN)
   ❌ Organization > Billing & Usage (HIDDEN)

Actions:
4. Verify "Settings" link is NOT present in sidebar
5. Attempt direct URL: /app/org/org-123/settings
6. Verify 403 Access Denied page appears
7. Verify audit log shows: [403 | bob@example.com | org:manage_settings | org-123]

Result: ✅ PASS
Evidence: Hidden items have zero UI presence; direct URL access blocked; audit logged
```

**Test Scenario C: Privilege Escalation Attack – Cross-Organization Boundary**

```
Setup:
- User: Charlie (charlie@example.com)
- Role: Org Admin in Org-ABC (ONLY)
- No access to Org-XYZ

Steps:
1. Log in as Charlie
2. Verify sidebar shows Org-ABC context
3. Attempt to access /app/org/org-xyz/members
4. Verify 403 Access Denied page
5. Verify audit log shows:
   ❌ [403 | charlie@example.com | org:view_members | org-xyz]

Result: ✅ PASS
Evidence: URL parameter (org-xyz) does NOT grant access; denial logged
```

**Test Scenario D: Context Switching – Dynamic Sidebar Update**

```
Setup:
- User: Diana (diana@example.com)
- Role: Org Admin in Org-A, Org Viewer in Org-B

Steps:
1. Log in as Diana
2. Navigate to /app/org/org-a/overview
3. Verify sidebar shows: "Organization > Settings" (Diana is admin in Org-A)
4. Navigate to /app/org/org-b/overview
5. Verify sidebar UPDATED: "Organization > Settings" is now HIDDEN
   (Diana is viewer in Org-B)
6. Navigate back to /app/org/org-a/overview
7. Verify sidebar RESTORED: "Organization > Settings" visible again

Result: ✅ PASS
Evidence: Sidebar filters dynamically based on org context; no page reload required
```

**Test Scenario E: Expired Permission – Time-Bound Access**

```
Setup:
- User: Eve (eve@example.com)
- Role: Temporary Org Admin in Org-TEMP
- Permission expiration: January 28, 2026 (Tomorrow)

Steps:
1. Log in as Eve on January 27, 2026
2. Navigate to /app/org/org-temp/settings
3. Verify content loads (permission valid)
4. Simulate time passage (advance system clock to Jan 28, 11:00 PM)
5. Refresh page
6. Verify 403 Access Denied (permission expired)
7. Verify audit log shows expiration reason

Result: ✅ PASS
Evidence: Time-bound permissions enforced; stale permissions rejected
```

---

## 3. Implementation Schedule & Resource Allocation

| Task | Component | File | Time | Owner | Status |
|------|-----------|------|------|-------|--------|
| **13.1** | Router Guard | `OptimizedProtectedRoute.tsx` | 20 min | @eng-lead-1 | Ready |
| **13.2** | Sidebar Filter | `Sidebar.tsx` | 30 min | @eng-lead-2 | Ready |
| **13.3** | Route Mapping | `CoreRoutes.tsx` | 15 min | @eng-lead-1 | Ready |
| **13.4** | Testing & QA | Test files | 20 min | @qa-engineer | Ready |

**Total Estimated Duration:** 1 hour 25 minutes (1.5 hours including buffer)

**Critical Path:** Task 13.1 → Task 13.2 → Task 13.3 → Task 13.4 (sequential)

---

## 4. Final Deliverables Checklist

### Code Deliverables
- [ ] `OptimizedProtectedRoute.tsx` – Enhanced with context-aware checks
- [ ] `Sidebar.tsx` – Dynamic filtering logic with memoization
- [ ] `CoreRoutes.tsx` – All routes mapped with permission configs
- [ ] `Sidebar.css` – Professional styling with active states
- [ ] `*.test.tsx` – Full test suite with 15+ test cases
- [ ] `auditLogger.ts` – Audit service with structured logging

### Documentation Deliverables
- [ ] **Route Configuration Map** – Table of all protected routes + required permissions
- [ ] **Permission Naming Convention Document** – Global, org, project naming standards
- [ ] **Testing Checklist** – 18-item verification matrix
- [ ] **Implementation Guide** – Step-by-step setup for new developers

### Verification Deliverables
- [ ] **Unit Test Report** – All 15+ tests passing
- [ ] **Integration Test Report** – All scenarios verified
- [ ] **Manual Test Evidence** – Screenshots/logs from 5 scenarios
- [ ] **Audit Log Sample** – Real examples of authorized/denied attempts

### Operational Deliverables
- [ ] **Monitoring Dashboard** – 403 error rates by route
- [ ] **Alert Rules** – Unusual denial pattern detection
- [ ] **Run-Book** – Troubleshooting guide for ops team

---

## 5. Success Criteria & Acceptance

### Must-Have Criteria (Non-Negotiable)
✅ URL parameter alone cannot grant access (privilege escalation blocked)  
✅ Sidebar has zero UI footprint for unauthorized items (no hidden buttons)  
✅ Audit log captures all access attempts with user/permission/result  
✅ Context switch (Org A → Org B) updates sidebar instantly  
✅ Expired permissions are enforced (time-bound access respected)  
✅ No broken links in sidebar (all visible items are accessible)  

### Performance Criteria
✅ Permission check latency < 5ms  
✅ Sidebar filter computation < 10ms (memoized)  
✅ Zero jank during navigation  

### Test Coverage Criteria
✅ Unit tests: 100% of permission check functions  
✅ Integration tests: All 5 manual scenarios  
✅ E2E tests: Critical privilege escalation attacks  

### Documentation Criteria
✅ Every protected route documented with permission  
✅ Permission naming conventions consistent (global/org/project)  
✅ Audit log schema documented  

---

## 6. Approval & Sign-Off

**This Phase is READY FOR IMMEDIATE EXECUTION.**

**Prerequisites Verified:**
✅ Phase 8 (RLS Policies) – Complete  
✅ Phase 9 (Auth Hook) – Complete  
✅ Design Review – Complete  
✅ Security Review – Complete  

**To Proceed:**
```
Please confirm readiness:
→ "Approved. Proceed with Phase 13 execution."
```

---

**Document Version:** 1.0  
**Last Updated:** January 27, 2026  
**Next Review:** Upon task completion (Feb 3, 2026)  
