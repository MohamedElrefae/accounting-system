/**
 * Reactive Permissions Hook
 * 
 * Feature: enterprise-auth-performance-optimization
 * Provides reactive permission updates without page refresh
 * 
 * Validates: Requirements 3.5
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPermissionService, type PermissionChange } from '../services/permission/PermissionService';
import type { AuthScope } from '../services/cache/CacheManager';

export interface UseReactivePermissionsOptions {
  userId?: string;
  scope?: AuthScope;
  enabled?: boolean;
  debounceMs?: number;
}

export interface ReactivePermissionState {
  permissions: Map<string, boolean>;
  lastUpdated: number;
  isUpdating: boolean;
  error: string | null;
}

/**
 * Hook for reactive permission updates
 * 
 * Provides real-time permission updates without page refresh.
 * Automatically refreshes permissions when changes are detected.
 * 
 * @param options - Configuration options
 * @returns Reactive permission state and refresh function
 */
export function useReactivePermissions(options: UseReactivePermissionsOptions = {}) {
  const {
    userId,
    scope,
    enabled = true,
    debounceMs = 100,
  } = options;

  const permissionServiceRef = useRef(getPermissionService());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<ReactivePermissionState>({
    permissions: new Map(),
    lastUpdated: 0,
    isUpdating: false,
    error: null,
  });

  /**
   * Refresh permissions from cache or database
   */
  const refreshPermissions = useCallback(async () => {
    if (!userId || !enabled) {
      return;
    }

    try {
      setState(prev => ({ ...prev, isUpdating: true, error: null }));

      const permissionService = permissionServiceRef.current;

      // Try to get cached permissions first
      let permissions = await permissionService.getCachedPermissions(userId, scope);

      // If not cached, fetch from database
      if (!permissions) {
        permissions = await permissionService.getPermissions(userId, scope);
      }

      // Convert to map for efficient lookup
      const permissionMap = new Map<string, boolean>();
      permissions.forEach(perm => {
        permissionMap.set(perm, true);
      });

      setState(prev => ({
        ...prev,
        permissions: permissionMap,
        lastUpdated: Date.now(),
        isUpdating: false,
      }));

      console.log(`✅ Refreshed ${permissions.length} permissions for user ${userId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh permissions';
      setState(prev => ({
        ...prev,
        isUpdating: false,
        error: errorMessage,
      }));
      console.error('Error refreshing permissions:', error);
    }
  }, [userId, scope, enabled]);

  /**
   * Handle permission change event
   */
  const handlePermissionChange = useCallback((changes: PermissionChange[]) => {
    console.log(`📝 Permission changes detected:`, changes);

    // Debounce refresh to avoid excessive updates
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      refreshPermissions();
    }, debounceMs);
  }, [refreshPermissions, debounceMs]);

  /**
   * Setup reactive subscription
   */
  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    try {
      const permissionService = permissionServiceRef.current;

      // Subscribe to permission changes
      unsubscribeRef.current = permissionService.subscribeToPermissionChanges(
        userId,
        handlePermissionChange
      );

      console.log(`📡 Reactive permissions enabled for user ${userId}`);
    } catch (error) {
      console.error('Error setting up reactive permissions:', error);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [userId, enabled, handlePermissionChange]);

  /**
   * Initial permission load
   */
  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    refreshPermissions();
  }, [userId, enabled, refreshPermissions]);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback((permission: string): boolean => {
    return state.permissions.get(permission) ?? false;
  }, [state.permissions]);

  /**
   * Check multiple permissions
   */
  const hasPermissions = useCallback((permissions: string[]): Record<string, boolean> => {
    return permissions.reduce((acc, perm) => {
      acc[perm] = state.permissions.get(perm) ?? false;
      return acc;
    }, {} as Record<string, boolean>);
  }, [state.permissions]);

  return {
    permissions: state.permissions,
    lastUpdated: state.lastUpdated,
    isUpdating: state.isUpdating,
    error: state.error,
    refreshPermissions,
    hasPermission,
    hasPermissions,
  };
}

export default useReactivePermissions;
