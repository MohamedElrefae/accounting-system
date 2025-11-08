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
    permissionsLoading,
    hasRouteAccess,
    hasActionAccess,
  } = useAuth();
  const location = useLocation();

  // Combine loading states for faster rendering
  const isLoading = loading || permissionsLoading;

  if (isLoading) {
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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Batch permission checks to avoid multiple function calls
  const pathname = location.pathname;
  const routeAllowed = hasRouteAccess(pathname);
  const actionAllowed = !requiredAction || hasActionAccess(requiredAction);

  if (!routeAllowed || !actionAllowed) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={redirectTo ?? '/unauthorized'} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
