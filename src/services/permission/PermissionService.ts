/**
 * Permission Service with Batch Processing
 * 
 * Implements batch permission validation, preloading, and reactive updates
 * to optimize authentication performance and reduce database queries.
 * 
 * Validates: Requirements 2.5, 3.1
 * Feature: enterprise-auth-performance-optimization
 */

import { supabase } from '../../utils/supabase';
import { getCacheManager } from '../cache/CacheManager';
import { cacheKeyStrategy, CACHE_TTL } from '../cache/CacheKeyStrategy';
import type { AuthScope } from '../cache/CacheManager';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Permission check request
 */
export interface PermissionCheck {
  resource: string;
  action: string;
  context?: Record<string, any>;
}

/**
 * Permission check result
 */
export interface PermissionResult {
  resource: string;
  action: string;
  allowed: boolean;
  reason?: string;
}

/**
 * Permission change event
 */
export interface PermissionChange {
  userId: string;
  resource: string;
  action: string;
  allowed: boolean;
  timestamp: number;
}

/**
 * Batch permission validation request
 */
export interface BatchPermissionRequest {
  userId: string;
  checks: PermissionCheck[];
  scope?: AuthScope;
}

/**
 * Batch permission validation response
 */
export interface BatchPermissionResponse {
  userId: string;
  results: PermissionResult[];
  cacheHit: boolean;
  responseTime: number;
}

/**
 * Permission subscription callback
 */
type PermissionChangeCallback = (changes: PermissionChange[]) => void;

/**
 * Permission Service with Batch Processing
 * 
 * Provides:
 * - Batch permission validation (replaces individual checks)
 * - Permission preloading during authentication
 * - Reactive permission update subscriptions
 * - Intelligent caching with TTL management
 */
export class PermissionService {
  private cacheManager = getCacheManager();
  private subscriptions: Map<string, Set<PermissionChangeCallback>> = new Map();
  private realtimeChannels: Map<string, RealtimeChannel> = new Map();
  private batchQueue: Map<string, PermissionCheck[]> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_TIMEOUT_MS = 50; // Batch requests within 50ms
  private readonly MAX_BATCH_SIZE = 100;

  /**
   * Assign permission to user
   * 
   * @param userId - User ID
   * @param roleId - Role ID
   * @param scopeId - Optional scope ID (org or project)
   * @param scopeType - Optional scope type
   */
  async assignPermission(
    userId: string,
    roleId: string,
    scopeId?: string,
    scopeType?: 'organization' | 'project'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          org_id: scopeType === 'organization' ? scopeId : null,
          project_id: scopeType === 'project' ? scopeId : null,
        });

      if (error) {
        throw error;
      }

      // Invalidate cache
      await this.invalidateUserPermissions(userId, scopeId ? { userId, orgId: scopeId } : undefined);
    } catch (error) {
      console.error('Error assigning permission:', error);
      throw error;
    }
  }

  /**
   * Revoke permission from user
   * 
   * @param userId - User ID
   * @param roleId - Role ID
   * @param scopeId - Optional scope ID
   * @param scopeType - Optional scope type
   */
  async revokePermission(
    userId: string,
    roleId: string,
    scopeId?: string,
    scopeType?: 'organization' | 'project'
  ): Promise<void> {
    try {
      let query = supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId);

      if (scopeType === 'organization' && scopeId) {
        query = query.eq('org_id', scopeId);
      } else if (scopeType === 'project' && scopeId) {
        query = query.eq('project_id', scopeId);
      } else {
        query = query.is('org_id', null).is('project_id', null);
      }

      const { error } = await query;

      if (error) {
        throw error;
      }

      // Invalidate cache
      await this.invalidateUserPermissions(userId, scopeId ? { userId, orgId: scopeId } : undefined);
    } catch (error) {
      console.error('Error revoking permission:', error);
      throw error;
    }
  }

  /**
   * Get user permissions
   * 
   * @param userId - User ID
   * @param scope - Optional scope
   */
  async getPermissions(userId: string, scope?: AuthScope): Promise<string[]> {
    return this.fetchUserPermissions(userId, scope);
  }

  /**
   * Validate multiple permissions in a single batch operation
   * 
   * Replaces individual permission checks with a single batch operation,
   * reducing database queries and improving performance.
   * 
   * @param userId - User ID to validate permissions for
   * @param checks - Array of permission checks to validate
   * @param scope - Optional scope (org, project) for scoped permission validation
   * @returns Batch permission validation results
   */
  async validatePermissionsBatch(
    userId: string,
    checks: PermissionCheck[],
    scope?: AuthScope
  ): Promise<BatchPermissionResponse> {
    const startTime = performance.now();

    try {
      // Check cache first
      const cacheKey = this.generateBatchCacheKey(userId, checks, scope);
      const cachedResult = await this.cacheManager.get<PermissionResult[]>(cacheKey);

      if (cachedResult) {
        const responseTime = performance.now() - startTime;
        return {
          userId,
          results: cachedResult,
          cacheHit: true,
          responseTime,
        };
      }

      // Validate permissions via RPC function
      const results = await this.validatePermissionsViaRPC(userId, checks, scope);

      // Cache the results
      await this.cacheManager.set(
        cacheKey,
        results,
        CACHE_TTL.permissions
      );

      const responseTime = performance.now() - startTime;

      return {
        userId,
        results,
        cacheHit: false,
        responseTime,
      };
    } catch (error) {
      console.error('Error validating permissions batch:', error);
      
      // Fallback: return denied for all checks on error
      return {
        userId,
        results: checks.map(check => ({
          resource: check.resource,
          action: check.action,
          allowed: false,
          reason: 'Permission validation failed',
        })),
        cacheHit: false,
        responseTime: performance.now() - startTime,
      };
    }
  }

  /**
   * Preload commonly accessed permissions during authentication
   * 
   * Populates cache with user's permissions immediately after login,
   * improving subsequent permission check performance.
   * 
   * @param userId - User ID to preload permissions for
   * @param scope - Optional scope for scoped permission preloading
   */
  async preloadUserPermissions(userId: string, scope?: AuthScope): Promise<void> {
    try {
      console.log(`🔄 Preloading permissions for user ${userId}...`);

      // Warm cache
      await this.cacheManager.warmPermissionCache(userId, scope);

      // Fetch user's permissions
      const permissions = await this.fetchUserPermissions(userId, scope);

      // Cache the permissions
      const cacheKey = cacheKeyStrategy.userPermissions(userId, scope?.orgId);
      await this.cacheManager.set(
        cacheKey,
        permissions,
        CACHE_TTL.permissions
      );

      console.log(`✅ Preloaded ${permissions.length} permissions for user ${userId}`);
    } catch (error) {
      console.error('Error preloading permissions:', error);
      // Non-fatal error - continue without preloading
    }
  }

  /**
   * Subscribe to permission changes for a user
   * 
   * Establishes real-time subscription to permission updates,
   * allowing UI to react to permission changes without page refresh.
   * 
   * @param userId - User ID to subscribe to
   * @param callback - Callback function for permission changes
   * @returns Unsubscribe function
   */
  subscribeToPermissionChanges(
    userId: string,
    callback: PermissionChangeCallback
  ): () => void {
    try {
      // Add callback to subscriptions
      if (!this.subscriptions.has(userId)) {
        this.subscriptions.set(userId, new Set());
        this.setupRealtimeSubscription(userId);
      }

      this.subscriptions.get(userId)!.add(callback);

      console.log(`📝 Added permission subscription for user ${userId}`);

      // Return unsubscribe function
      return () => {
        const callbacks = this.subscriptions.get(userId);
        if (callbacks) {
          callbacks.delete(callback);
          console.log(`🗑️ Removed permission subscription for user ${userId}`);

          // Clean up if no more subscribers
          if (callbacks.size === 0) {
            this.teardownRealtimeSubscription(userId);
          }
        }
      };
    } catch (error) {
      console.error('Error subscribing to permission changes:', error);
      return () => {}; // Return no-op unsubscribe
    }
  }

  /**
   * Invalidate cached permissions for a user
   * 
   * Clears cached permissions when they change, ensuring
   * subsequent requests fetch fresh data.
   * 
   * @param userId - User ID to invalidate cache for
   * @param scope - Optional scope to invalidate specific scope permissions
   */
  async invalidateUserPermissions(userId: string, scope?: AuthScope): Promise<void> {
    try {
      const pattern = scope
        ? `perm:${userId}:${scope.orgId || 'global'}:.*`
        : `perm:${userId}:.*`;

      await this.cacheManager.invalidate(pattern);

      console.log(`🗑️ Invalidated permissions cache for user ${userId}`);
    } catch (error) {
      console.error('Error invalidating permissions:', error);
    }
  }

  /**
   * Get cached permissions for a user
   * 
   * @param userId - User ID
   * @param scope - Optional scope
   * @returns Cached permissions or null if not cached
   */
  async getCachedPermissions(userId: string, scope?: AuthScope): Promise<string[] | null> {
    try {
      const cacheKey = cacheKeyStrategy.userPermissions(userId, scope?.orgId);
      return await this.cacheManager.get<string[]>(cacheKey);
    } catch (error) {
      console.error('Error getting cached permissions:', error);
      return null;
    }
  }

  /**
   * Check if user has a specific permission
   * 
   * @param userId - User ID
   * @param resource - Resource name
   * @param action - Action name
   * @param scope - Optional scope
   * @returns True if user has permission, false otherwise
   */
  async hasPermission(
    userId: string,
    resource: string,
    action: string,
    scope?: AuthScope
  ): Promise<boolean> {
    try {
      const result = await this.validatePermissionsBatch(
        userId,
        [{ resource, action }],
        scope
      );

      return result.results[0]?.allowed ?? false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check multiple permissions for a user
   * 
   * @param userId - User ID
   * @param permissions - Array of [resource, action] tuples
   * @param scope - Optional scope
   * @returns Map of permission to boolean
   */
  async hasPermissions(
    userId: string,
    permissions: Array<[string, string]>,
    scope?: AuthScope
  ): Promise<Map<string, boolean>> {
    try {
      const checks = permissions.map(([resource, action]) => ({
        resource,
        action,
      }));

      const result = await this.validatePermissionsBatch(userId, checks, scope);

      const permissionMap = new Map<string, boolean>();
      result.results.forEach(perm => {
        const key = `${perm.resource}:${perm.action}`;
        permissionMap.set(key, perm.allowed);
      });

      return permissionMap;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return new Map();
    }
  }

  // Private helper methods

  /**
   * Validate permissions via RPC function
   */
  private async validatePermissionsViaRPC(
    userId: string,
    checks: PermissionCheck[],
    scope?: AuthScope
  ): Promise<PermissionResult[]> {
    try {
      const { data, error } = await supabase.rpc('validate_permissions_batch', {
        p_user_id: userId,
        p_permission_checks: checks,
        p_org_id: scope?.orgId,
        p_project_id: scope?.projectId,
      });

      if (error) {
        console.error('RPC error validating permissions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error calling RPC function:', error);
      throw error;
    }
  }

  /**
   * Fetch user's permissions from database
   */
  private async fetchUserPermissions(userId: string, scope?: AuthScope): Promise<string[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_permissions', {
        p_user_id: userId,
        p_org_id: scope?.orgId,
        p_project_id: scope?.projectId,
      });

      if (error) {
        console.error('Error fetching user permissions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching permissions:', error);
      return [];
    }
  }

  /**
   * Generate cache key for batch permission check
   */
  private generateBatchCacheKey(
    userId: string,
    checks: PermissionCheck[],
    scope?: AuthScope
  ): string {
    // Create a deterministic checksum of the checks
    const checksStr = checks
      .map(c => `${c.resource}:${c.action}`)
      .sort()
      .join('|');

    const checksum = this.simpleHash(checksStr);
    const scopeKey = scope ? `${scope.orgId || 'global'}:${scope.projectId || 'global'}` : 'global';

    return `batch:perm:${userId}:${scopeKey}:${checksum}`;
  }

  /**
   * Simple hash function for generating checksums
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Setup real-time subscription for permission changes
   */
  private setupRealtimeSubscription(userId: string): void {
    try {
      const channel = supabase
        .channel(`permissions:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'role_permissions',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            this.handlePermissionChange(userId, payload);
          }
        )
        .subscribe((status) => {
          console.log(`📡 Permission subscription status for ${userId}:`, status);
        });

      this.realtimeChannels.set(userId, channel);
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
    }
  }

  /**
   * Teardown real-time subscription
   */
  private teardownRealtimeSubscription(userId: string): void {
    try {
      const channel = this.realtimeChannels.get(userId);
      if (channel) {
        supabase.removeChannel(channel);
        this.realtimeChannels.delete(userId);
        console.log(`🛑 Removed permission subscription for ${userId}`);
      }
    } catch (error) {
      console.error('Error tearing down subscription:', error);
    }
  }

  /**
   * Handle permission change event
   */
  private async handlePermissionChange(userId: string, payload: any): Promise<void> {
    try {
      console.log(`🔄 Permission change detected for user ${userId}:`, payload);

      // Invalidate cache
      await this.invalidateUserPermissions(userId);

      // Notify subscribers
      const callbacks = this.subscriptions.get(userId);
      if (callbacks && callbacks.size > 0) {
        const changes: PermissionChange[] = [
          {
            userId,
            resource: payload.new?.resource || 'unknown',
            action: payload.new?.action || 'unknown',
            allowed: payload.eventType !== 'DELETE',
            timestamp: Date.now(),
          },
        ];

        callbacks.forEach(callback => {
          try {
            callback(changes);
          } catch (error) {
            console.error('Error in permission change callback:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error handling permission change:', error);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      // Unsubscribe from all real-time channels
      for (const [userId, channel] of this.realtimeChannels.entries()) {
        supabase.removeChannel(channel);
      }

      this.realtimeChannels.clear();
      this.subscriptions.clear();

      console.log('✅ Permission service cleanup complete');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Singleton instance
let permissionServiceInstance: PermissionService | null = null;

/**
 * Get or create permission service instance
 */
export function getPermissionService(): PermissionService {
  if (!permissionServiceInstance) {
    permissionServiceInstance = new PermissionService();
  }
  return permissionServiceInstance;
}

/**
 * Reset permission service (for testing)
 */
export function resetPermissionService(): void {
  if (permissionServiceInstance) {
    permissionServiceInstance.cleanup();
  }
  permissionServiceInstance = null;
}

// Export singleton instance
export const permissionService = getPermissionService();
