/**
 * Memoized Permission Gate Component
 * 
 * Feature: enterprise-auth-performance-optimization
 * Property 6: UI Component Memoization
 * Validates: Requirements 3.2
 * 
 * High-performance permission-aware component that prevents unnecessary re-renders
 * through custom comparison functions and memoization strategies.
 */

import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export interface PermissionGateProps {
  permission: string;
  resource?: string;
  action?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  context?: Record<string, any>;
}

/**
 * Custom comparison function for PermissionGateProps
 * Prevents re-renders when props haven't meaningfully changed
 */
const arePropsEqual = (
  prevProps: PermissionGateProps,
  nextProps: PermissionGateProps
): boolean => {
  // Compare permission string
  if (prevProps.permission !== nextProps.permission) {
    return false;
  }

  // Compare resource and action
  if (prevProps.resource !== nextProps.resource || prevProps.action !== nextProps.action) {
    return false;
  }

  // Compare context object (shallow comparison)
  if (JSON.stringify(prevProps.context) !== JSON.stringify(nextProps.context)) {
    return false;
  }

  // Compare children count (not content, as that would be expensive)
  if (React.Children.count(prevProps.children) !== React.Children.count(nextProps.children)) {
    return false;
  }

  // Compare fallback presence
  if (!!prevProps.fallback !== !!nextProps.fallback) {
    return false;
  }

  return true;
};

/**
 * MemoizedPermissionGate Component
 * 
 * Renders children only if user has the specified permission.
 * Uses React.memo with custom comparison to prevent unnecessary re-renders.
 * 
 * Performance characteristics:
 * - Memoization prevents re-renders when props haven't changed
 * - Permission checks use cached results from AuthContext
 * - Suitable for permission-dependent UI elements
 * 
 * @example
 * ```tsx
 * <MemoizedPermissionGate permission="transactions:write">
 *   <CreateTransactionButton />
 * </MemoizedPermissionGate>
 * ```
 */
export const MemoizedPermissionGate = React.memo<PermissionGateProps>(
  ({ permission, resource, action, children, fallback, context }) => {
    const { checkPermission } = useAuth();

    // Memoize permission check result
    const hasPermission = useMemo(() => {
      try {
        // Use resource and action if provided, otherwise use permission string
        if (resource && action) {
          return checkPermission(resource, action, context);
        }
        return checkPermission(permission);
      } catch (error) {
        console.error('Permission check failed:', error);
        return false;
      }
    }, [permission, resource, action, context, checkPermission]);

    // Render children if permission granted, otherwise render fallback
    return hasPermission ? <>{children}</> : <>{fallback}</>;
  },
  arePropsEqual
);

MemoizedPermissionGate.displayName = 'MemoizedPermissionGate';

/**
 * Hook for batch permission checks
 * 
 * Validates: Requirements 3.2, 3.3
 * 
 * Efficiently checks multiple permissions in a single operation,
 * reducing component re-renders and improving performance.
 * 
 * @example
 * ```tsx
 * const permissions = useBatchPermissions(['transactions:read', 'reports:write']);
 * if (permissions['transactions:read']) {
 *   // Render transaction UI
 * }
 * ```
 */
export const useBatchPermissions = (permissions: string[]) => {
  const { checkPermissionsBatch } = useAuth();

  return useMemo(() => {
    try {
      return checkPermissionsBatch(permissions);
    } catch (error) {
      console.error('Batch permission check failed:', error);
      return permissions.reduce((acc, perm) => {
        acc[perm] = false;
        return acc;
      }, {} as Record<string, boolean>);
    }
  }, [permissions, checkPermissionsBatch]);
};

/**
 * Component-level caching for permission states
 * 
 * Validates: Requirements 3.2
 * 
 * Provides a cached permission state that updates reactively
 * without causing unnecessary component re-renders.
 */
export interface CachedPermissionState {
  permission: string;
  hasAccess: boolean;
  lastChecked: number;
  ttl: number;
}

const permissionCache = new Map<string, CachedPermissionState>();
const CACHE_TTL = 60000; // 1 minute

/**
 * Get cached permission state with TTL validation
 */
export const getCachedPermission = (permission: string): boolean | null => {
  const cached = permissionCache.get(permission);

  if (!cached) {
    return null;
  }

  // Check if cache entry has expired
  if (Date.now() - cached.lastChecked > cached.ttl) {
    permissionCache.delete(permission);
    return null;
  }

  return cached.hasAccess;
};

/**
 * Set cached permission state
 */
export const setCachedPermission = (permission: string, hasAccess: boolean): void => {
  permissionCache.set(permission, {
    permission,
    hasAccess,
    lastChecked: Date.now(),
    ttl: CACHE_TTL
  });
};

/**
 * Clear permission cache
 */
export const clearPermissionCache = (): void => {
  permissionCache.clear();
};

/**
 * Get cache statistics
 */
export const getPermissionCacheStats = () => {
  let validEntries = 0;
  let expiredEntries = 0;

  permissionCache.forEach((entry) => {
    if (Date.now() - entry.lastChecked > entry.ttl) {
      expiredEntries++;
    } else {
      validEntries++;
    }
  });

  return {
    totalEntries: permissionCache.size,
    validEntries,
    expiredEntries,
    cacheSize: permissionCache.size
  };
};
