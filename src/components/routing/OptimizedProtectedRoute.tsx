import React from 'react';
import { Navigate, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useOptimizedAuth } from '../../hooks/useOptimizedAuth';
import DashboardShellSkeleton from '../layout/DashboardShellSkeleton';

interface OptimizedProtectedRouteProps {
  children: React.ReactNode;

  // New props for scoped protection
  requiredPermission?: string;
  scope?: 'global' | 'org' | 'project' | 'org_or_project';

  // Fallback options
  fallback?: React.ReactNode;
  redirectTo?: string;
}

// Minimal loading component
const MinimalLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[200px] text-sm text-gray-500">
    Loading...
  </div>
);

/**
 * ENTERPRISE ROUTE GUARD
 * 
 * Enforces context-aware authorization before rendering protected components.
 * Validates permissions against organization/project context extracted from URL.
 */
const OptimizedProtectedRoute: React.FC<OptimizedProtectedRouteProps> = ({
  children,
  requiredPermission,
  scope = 'global',
  fallback,
  redirectTo = '/unauthorized',
}) => {
  const helpScreenshotsBypass = import.meta.env.VITE_HELP_SCREENSHOTS === 'true';
  const {
    user,
    loading,
    hasGlobalPermission, // Assuming this exists or falls back to legacy check
    hasRoleInOrg,
    hasRoleInProject,
    canPerformActionInOrg,
    canPerformActionInProject,
    hasActionAccess, // Legacy global check
  } = useOptimizedAuth();

  const location = useLocation();
  const navigate = useNavigate();

  // Extract context from URL
  const params = useParams<{
    orgId?: string;
    projectId?: string;
  }>();

  if (helpScreenshotsBypass) {
    return <>{children}</>;
  }

  // DEBUG: Trace Flicker (only in DEV mode)
  if (import.meta.env.DEV) {
    // console.log('[RouteGuard] Render:', {
    //   path: location.pathname,
    //   loading,
    //   user: !!user,
    //   roles: (user as any)?.roles || []
    // });
  }

  // 1. Loading State
  if (loading) {
    return <DashboardShellSkeleton />;
  }

  // 2. Auth State
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Authorization Check
  let isAuthorized = false;
  let denialReason = '';

  // If no specific permission required, we assume basic authenticated access is enough
  // unless we want to enforce pure context membership (e.g. "must be member of this org")
  if (!requiredPermission) {
    // Basic Membership Checks if context is present
    if (scope === 'org' && params.orgId) {
      // Just need ANY role in this org
      isAuthorized = hasRoleInOrg(params.orgId, 'viewer') ||
        hasRoleInOrg(params.orgId, 'admin') ||
        hasRoleInOrg(params.orgId, 'manager') ||
        hasRoleInOrg(params.orgId, 'accountant') ||
        hasRoleInOrg(params.orgId, 'auditor');
      if (!isAuthorized) denialReason = `Not a member of Organization ${params.orgId}`;
    } else if (scope === 'project' && params.projectId) {
      // Just need ANY role in this project
      isAuthorized = hasRoleInProject(params.projectId, 'viewer') ||
        hasRoleInProject(params.projectId, 'editor') ||
        hasRoleInProject(params.projectId, 'manager');
      if (!isAuthorized) denialReason = `Not a member of Project ${params.projectId}`;
    } else {
      // Global public route (authenticated)
      isAuthorized = true;
    }
  } else {
    // Specific Permission Required
    switch (scope) {
      case 'global':
        // Fallback to legacy hasActionAccess if hasGlobalPermission not explicit
        // Note: 'hasActionAccess' from useOptimizedAuth usually checks flat permissions
        isAuthorized = hasActionAccess ? hasActionAccess(requiredPermission) : false;
        denialReason = `Missing global permission: ${requiredPermission}`;
        break;

      case 'org':
        if (!params.orgId) {
          isAuthorized = false;
          denialReason = 'Organization context missing in URL';
        } else {
          // Use the 'canPerformActionInOrg' helper
          // Note: If the permission string is a Role (e.g. 'org_admin'), use hasRoleInOrg inheritance?
          // For now, assume it's an action. If it looks like a role, handle it.
          if (requiredPermission.includes('_') && !requiredPermission.startsWith('manage')) {
            // Heuristic: might be a role check? strict role check is rarer.
            // Better to stick to actions. But if we need role:
            isAuthorized = canPerformActionInOrg(params.orgId, requiredPermission as any);
          } else {
            isAuthorized = canPerformActionInOrg(params.orgId, requiredPermission as any);
          }
          denialReason = `Insufficient permissions in Organization ${params.orgId}`;
        }
        break;

      case 'project':
        if (!params.projectId) {
          isAuthorized = false;
          denialReason = 'Project context missing in URL';
        } else {
          isAuthorized = canPerformActionInProject(params.projectId, requiredPermission as any);
          denialReason = `Insufficient permissions in Project ${params.projectId}`;
        }
        break;

      default:
        isAuthorized = false;
        denialReason = 'Invalid scope configuration';
    }
  }

  if (import.meta.env.DEV && !isAuthorized) {
    console.warn(`[Auth Guard] Blocked access to ${location.pathname}`, {
      scope,
      requiredPermission,
      orgId: params.orgId,
      projectId: params.projectId,
      reason: denialReason
    });
  }

  if (!isAuthorized) {
    if (fallback) return <>{fallback}</>;
    // Redirect to unauthorized page, but prevent loop if we are already there
    if (location.pathname === redirectTo) return null;
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default OptimizedProtectedRoute;