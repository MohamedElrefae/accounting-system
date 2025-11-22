import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { PermissionCode } from '../../lib/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Optional action permission that must be granted in addition to the route */
  requiredAction?: PermissionCode;
  /** Optional fallback node to render instead of redirecting */
  fallback?: React.ReactNode;
  /** Override destination when authorization fails */
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredAction,
  fallback,
  redirectTo,
}) => {
  const {
    user,
    loading,
    hasRouteAccess,
    hasActionAccess,
    roles,
  } = useAuth();
  const location = useLocation();

  const isSuperAdmin = Array.isArray(roles) && roles.includes('super_admin');

  if (import.meta.env.DEV) {
    console.log('[ProtectedRoute] render', {
      pathname: location.pathname,
      loading,
      hasUser: !!user,
      requiredAction: requiredAction ?? null,
      isSuperAdmin,
    });
  }

  // Fast loading check
  if (loading) {
    if (import.meta.env.DEV) {
      console.log('[ProtectedRoute] still loading auth/permissions for', location.pathname);
    }
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px', // Reduced from 100vh for faster perceived loading
        }}
      >
        <div>Loading…</div>
      </div>
    );
  }

  if (!user) {
    if (import.meta.env.DEV) {
      console.log('[ProtectedRoute] no user, redirecting to /login from', location.pathname);
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Super admin override: always allow if user has super_admin role
  if (isSuperAdmin) {
    if (import.meta.env.DEV) {
      console.log('[ProtectedRoute] super_admin override granted for', location.pathname);
    }
    return <>{children}</>;
  }

  // Batch permission checks to avoid multiple function calls
  const pathname = location.pathname;
  const routeAllowed = hasRouteAccess(pathname);
  const actionAllowed = !requiredAction || hasActionAccess(requiredAction);

  if (import.meta.env.DEV) {
    console.log('[ProtectedRoute] permissions check', {
      pathname,
      routeAllowed,
      actionAllowed,
      requiredAction: requiredAction ?? null,
    });
  }

  if (!routeAllowed || !actionAllowed) {
    if (import.meta.env.DEV) {
      console.log('[ProtectedRoute] access denied, redirecting to', redirectTo ?? '/unauthorized');
    }
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={redirectTo ?? '/unauthorized'} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
