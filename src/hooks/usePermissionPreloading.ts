/**
 * Permission Preloading Hook
 * 
 * Feature: enterprise-auth-performance-optimization
 * Implements permission preloading during authentication and reactive updates
 * 
 * Validates: Requirements 3.4, 3.5
 */

import { useEffect, useRef, useCallback } from 'react';
import { getPermissionService, type PermissionChange } from '../services/permission/PermissionService';
import type { AuthScope } from '../services/cache/CacheManager';

export interface UsePermissionPreloadingOptions {
  userId?: string;
  scope?: AuthScope;
  enabled?: boolean;
  onPermissionChange?: (changes: PermissionChange[]) => void;
}

/**
 * Hook for permission preloading and reactive updates
 * 
 * Preloads user permissions during authentication and sets up
 * real-time subscriptions for permission changes.
 * 
 * @param options - Configuration options
 * @returns Object with preloading status and unsubscribe function
 */
export function usePermissionPreloading(options: UsePermissionPreloadingOptions = {}) {
  const {
    userId,
    scope,
    enabled = true,
    onPermissionChange,
  } = options;

  const permissionServiceRef = useRef(getPermissionService());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const preloadingRef = useRef(false);

  /**
   * Preload permissions for the user
   * 
   * Populates cache with user's permissions immediately after login,
   * improving subsequent permission check performance.
   */
  const preloadPermissions = useCallback(async () => {
    if (!userId || !enabled || preloadingRef.current) {
      return;
    }

    try {
      preloadingRef.current = true;
      console.log(`🔄 Preloading permissions for user ${userId}...`);

      const permissionService = permissionServiceRef.current;
      await permissionService.preloadUserPermissions(userId, scope);

      console.log(`✅ Permission preloading complete for user ${userId}`);
    } catch (error) {
      console.error('Error preloading permissions:', error);
    } finally {
      preloadingRef.current = false;
    }
  }, [userId, scope, enabled]);

  /**
   * Setup reactive permission updates
   * 
   * Subscribes to real-time permission changes and updates UI
   * without requiring a page refresh.
   */
  const setupReactiveUpdates = useCallback(() => {
    if (!userId || !enabled) {
      return;
    }

    try {
      const permissionService = permissionServiceRef.current;

      // Subscribe to permission changes
      unsubscribeRef.current = permissionService.subscribeToPermissionChanges(
        userId,
        (changes: PermissionChange[]) => {
          console.log(`📝 Permission changes detected for user ${userId}:`, changes);

          // Notify parent component of changes
          if (onPermissionChange) {
            onPermissionChange(changes);
          }

          // Invalidate cache to force refresh
          permissionService.invalidateUserPermissions(userId, scope);
        }
      );

      console.log(`📡 Reactive permission updates enabled for user ${userId}`);
    } catch (error) {
      console.error('Error setting up reactive updates:', error);
    }
  }, [userId, scope, enabled, onPermissionChange]);

  /**
   * Cleanup subscriptions on unmount
   */
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  /**
   * Preload permissions when userId changes
   */
  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    preloadPermissions();
  }, [userId, enabled, preloadPermissions]);

  /**
   * Setup reactive updates when userId changes
   */
  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    setupReactiveUpdates();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [userId, enabled, setupReactiveUpdates]);

  return {
    preloadPermissions,
    setupReactiveUpdates,
    isPreloading: preloadingRef.current,
  };
}

export default usePermissionPreloading;
