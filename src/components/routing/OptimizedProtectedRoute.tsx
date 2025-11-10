import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useOptimizedAuth } from '../../hooks/useOptimizedAuth';
import type { PermissionCode } from '../../lib/permissions';

interface OptimizedProtectedRouteProps {
  children: React.ReactNode;
  requiredAction?: PermissionCode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

// Minimal loading component for better performance
const MinimalLoader: React.FC = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    fontSize: '14px',
    color: '#666'
  }}>
    Loading...
  </div>
);

const OptimizedProtectedRoute: React.FC<OptimizedProtectedRouteProps> = ({
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
  } = useOptimizedAuth();
  const location = useLocation();

  // Fast loading check
  if (loading) {
    return <MinimalLoader />;
  }

  // Fast auth check
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Batch permission checks for better performance
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

export default OptimizedProtectedRoute;