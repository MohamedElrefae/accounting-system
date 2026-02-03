/**
 * Cache Invalidation Service
 * 
 * Implements cache invalidation strategies for role and permission changes
 * with background cache refresh without blocking operations.
 * 
 * Validates: Requirements 2.2, 2.4
 */

import { CacheManager } from './CacheManager';
import { cacheKeyStrategy, cacheInvalidationPatterns, CACHE_TTL } from './CacheKeyStrategy';

export interface InvalidationEvent {
  type: 'role_change' | 'permission_change' | 'org_membership_change' | 'project_membership_change';
  userId: string;
  orgId?: string;
  projectId?: string;
  timestamp: number;
}

export interface BackgroundRefreshTask {
  id: string;
  userId: string;
  scope?: 'org' | 'project' | 'global';
  orgId?: string;
  projectId?: string;
  priority: 'high' | 'normal' | 'low';
  createdAt: number;
  retries: number;
  maxRetries: number;
}

export interface InvalidationStrategy {
  pattern: string;
  ttl?: number;
  refreshInBackground?: boolean;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Cache Invalidation Service
 * Manages cache invalidation for role and permission changes
 */
export class CacheInvalidationService {
  private cacheManager: CacheManager;
  private backgroundRefreshQueue: Map<string, BackgroundRefreshTask> = new Map();
  private invalidationListeners: Map<string, Set<(event: InvalidationEvent) => void>> = new Map();
  private refreshInProgress: Set<string> = new Set();
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
    this.startBackgroundRefreshWorker();
  }

  /**
   * Invalidate cache for role changes
   */
  async invalidateRoleChange(
    userId: string,
    roleType: 'org' | 'project' | 'system',
    orgId?: string,
    projectId?: string
  ): Promise<void> {
    try {
      const keysToInvalidate: string[] = [];

      // Invalidate user auth data
      keysToInvalidate.push(cacheKeyStrategy.userAuth(userId));

      // Invalidate user permissions
      keysToInvalidate.push(cacheKeyStrategy.userPermissions(userId, 'global'));

      // Invalidate role hierarchy
      keysToInvalidate.push(cacheKeyStrategy.roleHierarchy(userId, roleType));

      // Execute invalidation for specific keys
      for (const key of keysToInvalidate) {
        await this.cacheManager.invalidate(key);
      }

      // Queue background refresh
      await this.queueBackgroundRefresh(userId, roleType, orgId, projectId, 'high');

      // Emit invalidation event
      this.emitInvalidationEvent({
        type: 'role_change',
        userId,
        orgId,
        projectId,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error invalidating role change cache:', error);
    }
  }

  /**
   * Invalidate cache for permission changes
   */
  async invalidatePermissionChange(
    userId: string,
    orgId?: string,
    projectId?: string
  ): Promise<void> {
    try {
      // Invalidate specific permission keys for this user
      const keysToInvalidate: string[] = [];

      // Invalidate user permissions for all scopes
      keysToInvalidate.push(cacheKeyStrategy.userPermissions(userId, 'global'));
      if (orgId) {
        keysToInvalidate.push(cacheKeyStrategy.userPermissions(userId, orgId));
      }
      if (projectId) {
        keysToInvalidate.push(cacheKeyStrategy.userPermissions(userId, projectId));
      }

      // Invalidate user auth data (permissions are part of auth)
      keysToInvalidate.push(cacheKeyStrategy.userAuth(userId));

      // Invalidate all batch permission checks for this user
      await this.cacheManager.invalidate(cacheInvalidationPatterns.batchPermissionsPattern());

      // Execute invalidation for specific keys
      for (const key of keysToInvalidate) {
        await this.cacheManager.invalidate(key);
      }

      // Queue background refresh
      await this.queueBackgroundRefresh(userId, 'global', orgId, projectId, 'high');

      // Emit invalidation event
      this.emitInvalidationEvent({
        type: 'permission_change',
        userId,
        orgId,
        projectId,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error invalidating permission change cache:', error);
    }
  }

  /**
   * Invalidate cache for organization membership changes
   */
  async invalidateOrgMembershipChange(
    userId: string,
    orgId: string
  ): Promise<void> {
    try {
      const keysToInvalidate: string[] = [];

      // Invalidate user auth data
      keysToInvalidate.push(cacheKeyStrategy.userAuth(userId));

      // Invalidate organization membership
      keysToInvalidate.push(cacheKeyStrategy.orgMembership(userId, orgId));

      // Execute invalidation
      for (const key of keysToInvalidate) {
        await this.cacheManager.invalidate(key);
      }

      // Queue background refresh
      await this.queueBackgroundRefresh(userId, 'org', orgId, undefined, 'normal');

      // Emit invalidation event
      this.emitInvalidationEvent({
        type: 'org_membership_change',
        userId,
        orgId,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error invalidating org membership change cache:', error);
    }
  }

  /**
   * Invalidate cache for project membership changes
   */
  async invalidateProjectMembershipChange(
    userId: string,
    projectId: string
  ): Promise<void> {
    try {
      // Invalidate user auth data (exact key match)
      await this.cacheManager.invalidate(cacheKeyStrategy.userAuth(userId));

      // Invalidate project membership (exact key match)
      await this.cacheManager.invalidate(cacheKeyStrategy.projectMembership(userId, projectId));

      // Queue background refresh
      await this.queueBackgroundRefresh(userId, 'project', undefined, projectId, 'normal');

      // Emit invalidation event
      this.emitInvalidationEvent({
        type: 'project_membership_change',
        userId,
        projectId,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error invalidating project membership change cache:', error);
    }
  }

  /**
   * Queue background cache refresh
   */
  private async queueBackgroundRefresh(
    userId: string,
    scope: 'org' | 'project' | 'global',
    orgId?: string,
    projectId?: string,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<void> {
    const taskId = `refresh:${userId}:${scope}:${orgId || 'none'}:${projectId || 'none'}`;

    const task: BackgroundRefreshTask = {
      id: taskId,
      userId,
      scope,
      orgId,
      projectId,
      priority,
      createdAt: Date.now(),
      retries: 0,
      maxRetries: 3,
    };

    this.backgroundRefreshQueue.set(taskId, task);
  }

  /**
   * Start background refresh worker
   */
  private startBackgroundRefreshWorker(): void {
    // Process background refresh tasks every 5 seconds
    this.refreshInterval = setInterval(() => {
      this.processBackgroundRefreshQueue();
    }, 5000);
  }

  /**
   * Process background refresh queue
   */
  private async processBackgroundRefreshQueue(): Promise<void> {
    try {
      // Sort tasks by priority
      const tasks = Array.from(this.backgroundRefreshQueue.values())
        .sort((a, b) => {
          const priorityOrder = { high: 0, normal: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

      // Process high-priority tasks immediately
      const highPriorityTasks = tasks.filter(t => t.priority === 'high').slice(0, 5);
      
      for (const task of highPriorityTasks) {
        if (!this.refreshInProgress.has(task.id)) {
          await this.executeBackgroundRefresh(task);
        }
      }

      // Process normal-priority tasks with rate limiting
      const normalTasks = tasks.filter(t => t.priority === 'normal').slice(0, 2);
      
      for (const task of normalTasks) {
        if (!this.refreshInProgress.has(task.id)) {
          await this.executeBackgroundRefresh(task);
        }
      }
    } catch (error) {
      console.error('Error processing background refresh queue:', error);
    }
  }

  /**
   * Execute background refresh for a task
   */
  private async executeBackgroundRefresh(task: BackgroundRefreshTask): Promise<void> {
    this.refreshInProgress.add(task.id);

    try {
      // This is a placeholder - actual refresh logic would be implemented
      // by the auth service that uses this invalidation service
      
      // Simulate refresh delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Remove from queue on success
      this.backgroundRefreshQueue.delete(task.id);
    } catch (error) {
      console.warn(`Background refresh failed for task ${task.id}:`, error);

      // Retry with exponential backoff
      if (task.retries < task.maxRetries) {
        task.retries++;
        task.createdAt = Date.now(); // Reset timestamp for retry
      } else {
        // Remove from queue after max retries
        this.backgroundRefreshQueue.delete(task.id);
      }
    } finally {
      this.refreshInProgress.delete(task.id);
    }
  }

  /**
   * Subscribe to invalidation events
   */
  subscribe(
    eventType: InvalidationEvent['type'],
    callback: (event: InvalidationEvent) => void
  ): () => void {
    if (!this.invalidationListeners.has(eventType)) {
      this.invalidationListeners.set(eventType, new Set());
    }

    this.invalidationListeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.invalidationListeners.get(eventType)?.delete(callback);
    };
  }

  /**
   * Emit invalidation event
   */
  private emitInvalidationEvent(event: InvalidationEvent): void {
    const listeners = this.invalidationListeners.get(event.type);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in invalidation event listener:', error);
        }
      }
    }
  }

  /**
   * Get background refresh queue status
   */
  getQueueStatus(): {
    totalTasks: number;
    highPriority: number;
    normalPriority: number;
    lowPriority: number;
    inProgress: number;
  } {
    const tasks = Array.from(this.backgroundRefreshQueue.values());

    return {
      totalTasks: tasks.length,
      highPriority: tasks.filter(t => t.priority === 'high').length,
      normalPriority: tasks.filter(t => t.priority === 'normal').length,
      lowPriority: tasks.filter(t => t.priority === 'low').length,
      inProgress: this.refreshInProgress.size,
    };
  }

  /**
   * Clear background refresh queue
   */
  async clearQueue(): Promise<void> {
    this.backgroundRefreshQueue.clear();
  }

  /**
   * Stop background refresh worker
   */
  stop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Destroy service
   */
  destroy(): void {
    this.stop();
    this.backgroundRefreshQueue.clear();
    this.invalidationListeners.clear();
    this.refreshInProgress.clear();
  }
}

// Singleton instance
let invalidationServiceInstance: CacheInvalidationService | null = null;

/**
 * Get or create cache invalidation service instance
 */
export function getCacheInvalidationService(cacheManager: CacheManager): CacheInvalidationService {
  if (!invalidationServiceInstance) {
    invalidationServiceInstance = new CacheInvalidationService(cacheManager);
  }
  return invalidationServiceInstance;
}

/**
 * Reset cache invalidation service (for testing)
 */
export function resetCacheInvalidationService(): void {
  if (invalidationServiceInstance) {
    invalidationServiceInstance.destroy();
  }
  invalidationServiceInstance = null;
}
