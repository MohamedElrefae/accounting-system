import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface RequirePermissionProps {
  anyOf?: string[];
  allOf?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({ anyOf, allOf, children, fallback = null }) => {
  const { loading, hasAny, hasAll } = usePermissions();

  if (loading) return null;

  if (anyOf && anyOf.length > 0) {
    return hasAny(anyOf) ? <>{children}</> : <>{fallback}</>;
  }

  if (allOf && allOf.length > 0) {
    return hasAll(allOf) ? <>{children}</> : <>{fallback}</>;
  }

  // If no permissions specified, allow by default
  return <>{children}</>;
};

