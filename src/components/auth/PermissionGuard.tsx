import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

export const PermissionGuard: React.FC<{
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ permission, permissions = [], requireAll = false, fallback = null, children }) => {
  const { loading, hasPermission, hasAny, hasAll } = usePermissions();

  if (loading) return null;

  let authorized = false;
  if (permission) {
    authorized = hasPermission(permission);
  } else if (permissions.length > 0) {
    authorized = requireAll ? hasAll(permissions) : hasAny(permissions);
  } else {
    authorized = true; // No permission required
  }

  return authorized ? <>{children}</> : <>{fallback}</>;
};
