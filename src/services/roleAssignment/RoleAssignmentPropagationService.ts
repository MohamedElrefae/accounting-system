/**
 * Role Assignment Propagation Service
 * 
 * Implements real-time role assignment update propagation with:
 * - Real-time role assignment update propagation
 * - Session update mechanisms for role changes
 * - Distributed session synchronization
 * 
 * Validates: Requirements 4.5
 * Feature: enterprise-auth-performance-optimization, Property 12: Role Assignment Propagation
 */

import { supabase } from '@/utils/supabase';
import { getCacheManager } from '../cache/CacheManager';
import { getCacheInvalidationService } from '../cache/CacheInvalidationService';
import { sessionManager } from '../session/SessionManager';

export interface RoleAssignmentEvent {
  id: string;
  type: 'org_role_assigned' | 'org_role_updated' | 'org_role_removed' | 
        'project_role_assigned' | 'project_role_updated' | 'project_role_removed' |
        'system_role_assigned' | 'system_role_removed';
  userId: string;
  role: string;
  orgId?: string;
  projectId?: string;
  previousRole?: string;
  timestamp: number;
  propagatedAt?: number;
  propagationStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface SessionUpdateTask {
  id: string;
  userId: string;
  sessionId: string;
  eventId: string;
  updateType: 'role_change' | 'permission_refresh' | 'full_sync';
  priority: 'high' | 'normal' | 'low';
  createdAt: number;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface DistributedSessionSync {
  userId: string;
  sessionIds: string[];
  syncType: 'role_update' | 'permission_refresh' | 'full_sync';
  targetTimestamp: number;
  completedAt?: number;
}

/**
 * Role Assignment Propagation Service
 * Manages real-time propagation of role changes to all affected sessions
 */
export class RoleAssignmentPropagationService {
  private cacheManager = getCacheManager();
  private invalidationService: any; // Will be initialized lazily
  private roleAssignmentEvents: Map<string, RoleAssignmentEvent> = new Map();
  private sessionUpdateQueue: Map<string, SessionUpdateTask> = new Map();
  private distributedSyncs: Map<string, DistributedSessionSync> = new Map();
  private eventListeners: Map<string, Set<(event: RoleAssignmentEvent) => void>> = new Map();
  private propagationWorker: NodeJS.Timeout | null = null;
  private sessionUpdateWorker: NodeJS.Timeout | null = null;
  private userSessionMap: Map<string, Set<string>> = new Map(); // userId -> sessionIds
  private propagationTimeout = 5000; // 5 seconds max propagation time

  constructor() {
    this.startPropagationWorker();
    this.startSessionUpdateWorker();
    this.setupRealtimeSubscriptions();
  }

  /**
   * Assign org role and propagate to all sessions
   */
  async assignOrgRole(
    userId: string,
    orgId: string,
    role: string,
    canAccessAllProjects?: boolean
  ): Promise<RoleAssignmentEvent> {
    const event: RoleAssignmentEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'org_role_assigned',
      userId,
      role,
      orgId,
      timestamp: Date.now(),
      propagationStatus: 'pending',
    };

    try {
      // Store event
      this.roleAssignmentEvents.set(event.id, event);

      // Perform database operation
      const { data, error } = await supabase
        .from('org_roles')
        .insert([
          {
            user_id: userId,
            org_id: orgId,
            role,
            can_access_all_projects: canAccessAllProjects || false,
            created_by: (await supabase.auth.getUser()).data.user?.id,
          },
        ])
        .select();

      if (error) throw error;

      // Mark event as in progress
      event.propagationStatus = 'in_progress';

      // Invalidate cache for this user
      await this.invalidateUserCache(userId, orgId);

      // Queue session updates
      await this.queueSessionUpdates(userId, event.id, 'role_change', 'high');

      // Emit event
      this.emitRoleAssignmentEvent(event);

      return event;
    } catch (error) {
      console.error('Error assigning org role:', error);
      event.propagationStatus = 'failed';
      throw error;
    }
  }

  /**
   * Update org role and propagate to all sessions
   */
  async updateOrgRole(
    userId: string,
    orgId: string,
    newRole: string,
    canAccessAllProjects?: boolean
  ): Promise<RoleAssignmentEvent> {
    // Get previous role for event tracking
    const { data: previousData } = await supabase
      .from('org_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .single();

    const previousRole = previousData?.role;

    const event: RoleAssignmentEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'org_role_updated',
      userId,
      role: newRole,
      previousRole,
      orgId,
      timestamp: Date.now(),
      propagationStatus: 'pending',
    };

    try {
      // Store event
      this.roleAssignmentEvents.set(event.id, event);

      // Perform database operation
      const { data, error } = await supabase
        .from('org_roles')
        .update({
          role: newRole,
          can_access_all_projects: canAccessAllProjects,
        })
        .eq('user_id', userId)
        .eq('org_id', orgId)
        .select();

      if (error) throw error;

      // Mark event as in progress
      event.propagationStatus = 'in_progress';

      // Invalidate cache for this user
      await this.invalidateUserCache(userId, orgId);

      // Queue session updates
      await this.queueSessionUpdates(userId, event.id, 'role_change', 'high');

      // Emit event
      this.emitRoleAssignmentEvent(event);

      return event;
    } catch (error) {
      console.error('Error updating org role:', error);
      event.propagationStatus = 'failed';
      throw error;
    }
  }

  /**
   * Remove org role and propagate to all sessions
   */
  async removeOrgRole(userId: string, orgId: string): Promise<RoleAssignmentEvent> {
    // Get role being removed for event tracking
    const { data: previousData } = await supabase
      .from('org_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .single();

    const previousRole = previousData?.role;

    const event: RoleAssignmentEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'org_role_removed',
      userId,
      role: previousRole || 'unknown',
      previousRole,
      orgId,
      timestamp: Date.now(),
      propagationStatus: 'pending',
    };

    try {
      // Store event
      this.roleAssignmentEvents.set(event.id, event);

      // Perform database operation
      const { error } = await supabase
        .from('org_roles')
        .delete()
        .eq('user_id', userId)
        .eq('org_id', orgId);

      if (error) throw error;

      // Mark event as in progress
      event.propagationStatus = 'in_progress';

      // Invalidate cache for this user
      await this.invalidateUserCache(userId, orgId);

      // Queue session updates
      await this.queueSessionUpdates(userId, event.id, 'role_change', 'high');

      // Emit event
      this.emitRoleAssignmentEvent(event);

      return event;
    } catch (error) {
      console.error('Error removing org role:', error);
      event.propagationStatus = 'failed';
      throw error;
    }
  }

  /**
   * Assign project role and propagate to all sessions
   */
  async assignProjectRole(
    userId: string,
    projectId: string,
    role: string
  ): Promise<RoleAssignmentEvent> {
    const event: RoleAssignmentEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'project_role_assigned',
      userId,
      role,
      projectId,
      timestamp: Date.now(),
      propagationStatus: 'pending',
    };

    try {
      // Store event
      this.roleAssignmentEvents.set(event.id, event);

      // Perform database operation
      const { data, error } = await supabase
        .from('project_roles')
        .insert([
          {
            user_id: userId,
            project_id: projectId,
            role,
            created_by: (await supabase.auth.getUser()).data.user?.id,
          },
        ])
        .select();

      if (error) throw error;

      // Mark event as in progress
      event.propagationStatus = 'in_progress';

      // Invalidate cache for this user
      await this.invalidateUserCache(userId, undefined, projectId);

      // Queue session updates
      await this.queueSessionUpdates(userId, event.id, 'role_change', 'high');

      // Emit event
      this.emitRoleAssignmentEvent(event);

      return event;
    } catch (error) {
      console.error('Error assigning project role:', error);
      event.propagationStatus = 'failed';
      throw error;
    }
  }

  /**
   * Update project role and propagate to all sessions
   */
  async updateProjectRole(
    userId: string,
    projectId: string,
    newRole: string
  ): Promise<RoleAssignmentEvent> {
    // Get previous role for event tracking
    const { data: previousData } = await supabase
      .from('project_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .single();

    const previousRole = previousData?.role;

    const event: RoleAssignmentEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'project_role_updated',
      userId,
      role: newRole,
      previousRole,
      projectId,
      timestamp: Date.now(),
      propagationStatus: 'pending',
    };

    try {
      // Store event
      this.roleAssignmentEvents.set(event.id, event);

      // Perform database operation
      const { data, error } = await supabase
        .from('project_roles')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .select();

      if (error) throw error;

      // Mark event as in progress
      event.propagationStatus = 'in_progress';

      // Invalidate cache for this user
      await this.invalidateUserCache(userId, undefined, projectId);

      // Queue session updates
      await this.queueSessionUpdates(userId, event.id, 'role_change', 'high');

      // Emit event
      this.emitRoleAssignmentEvent(event);

      return event;
    } catch (error) {
      console.error('Error updating project role:', error);
      event.propagationStatus = 'failed';
      throw error;
    }
  }

  /**
   * Remove project role and propagate to all sessions
   */
  async removeProjectRole(userId: string, projectId: string): Promise<RoleAssignmentEvent> {
    // Get role being removed for event tracking
    const { data: previousData } = await supabase
      .from('project_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .single();

    const previousRole = previousData?.role;

    const event: RoleAssignmentEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'project_role_removed',
      userId,
      role: previousRole || 'unknown',
      previousRole,
      projectId,
      timestamp: Date.now(),
      propagationStatus: 'pending',
    };

    try {
      // Store event
      this.roleAssignmentEvents.set(event.id, event);

      // Perform database operation
      const { error } = await supabase
        .from('project_roles')
        .delete()
        .eq('user_id', userId)
        .eq('project_id', projectId);

      if (error) throw error;

      // Mark event as in progress
      event.propagationStatus = 'in_progress';

      // Invalidate cache for this user
      await this.invalidateUserCache(userId, undefined, projectId);

      // Queue session updates
      await this.queueSessionUpdates(userId, event.id, 'role_change', 'high');

      // Emit event
      this.emitRoleAssignmentEvent(event);

      return event;
    } catch (error) {
      console.error('Error removing project role:', error);
      event.propagationStatus = 'failed';
      throw error;
    }
  }

  /**
   * Register user session for tracking
   */
  registerUserSession(userId: string, sessionId: string): void {
    if (!this.userSessionMap.has(userId)) {
      this.userSessionMap.set(userId, new Set());
    }
    this.userSessionMap.get(userId)!.add(sessionId);
  }

  /**
   * Unregister user session
   */
  unregisterUserSession(userId: string, sessionId: string): void {
    const sessions = this.userSessionMap.get(userId);
    if (sessions) {
      sessions.delete(sessionId);
      if (sessions.size === 0) {
        this.userSessionMap.delete(userId);
      }
    }
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): string[] {
    const sessions = this.userSessionMap.get(userId);
    return sessions ? Array.from(sessions) : [];
  }

  /**
   * Subscribe to role assignment events
   */
  subscribe(
    eventType: RoleAssignmentEvent['type'],
    callback: (event: RoleAssignmentEvent) => void
  ): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }

    this.eventListeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(eventType)?.delete(callback);
    };
  }

  /**
   * Get propagation status for an event
   */
  getEventStatus(eventId: string): RoleAssignmentEvent | null {
    return this.roleAssignmentEvents.get(eventId) || null;
  }

  /**
   * Get session update queue status
   */
  getQueueStatus(): {
    totalTasks: number;
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
  } {
    const tasks = Array.from(this.sessionUpdateQueue.values());

    return {
      totalTasks: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
    };
  }

  /**
   * Destroy service
   */
  destroy(): void {
    if (this.propagationWorker) {
      clearInterval(this.propagationWorker);
    }
    if (this.sessionUpdateWorker) {
      clearInterval(this.sessionUpdateWorker);
    }
    this.roleAssignmentEvents.clear();
    this.sessionUpdateQueue.clear();
    this.distributedSyncs.clear();
    this.eventListeners.clear();
    this.userSessionMap.clear();
  }

  // Private helper methods

  private async invalidateUserCache(userId: string, orgId?: string, projectId?: string): Promise<void> {
    try {
      // Initialize invalidation service if needed
      if (!this.invalidationService) {
        this.invalidationService = getCacheInvalidationService(this.cacheManager);
      }

      // Invalidate role changes
      await this.invalidationService.invalidateRoleChange(
        userId,
        orgId ? 'org' : projectId ? 'project' : 'system',
        orgId,
        projectId
      );

      // Invalidate permission changes
      await this.invalidationService.invalidatePermissionChange(userId, orgId, projectId);
    } catch (error) {
      console.error('Error invalidating user cache:', error);
    }
  }

  private async queueSessionUpdates(
    userId: string,
    eventId: string,
    updateType: 'role_change' | 'permission_refresh' | 'full_sync',
    priority: 'high' | 'normal' | 'low'
  ): Promise<void> {
    const sessions = this.getUserSessions(userId);

    for (const sessionId of sessions) {
      const taskId = `task_${eventId}_${sessionId}`;

      const task: SessionUpdateTask = {
        id: taskId,
        userId,
        sessionId,
        eventId,
        updateType,
        priority,
        createdAt: Date.now(),
        retries: 0,
        maxRetries: 3,
        status: 'pending',
      };

      this.sessionUpdateQueue.set(taskId, task);
    }
  }

  private startPropagationWorker(): void {
    // Process role assignment events every 1 second
    this.propagationWorker = setInterval(() => {
      this.processPropagationQueue();
    }, 1000);
  }

  private async processPropagationQueue(): Promise<void> {
    try {
      const events = Array.from(this.roleAssignmentEvents.values())
        .filter(e => e.propagationStatus === 'in_progress');

      for (const event of events) {
        const elapsedTime = Date.now() - event.timestamp;

        // Check if propagation is complete (all sessions updated or timeout)
        if (elapsedTime > this.propagationTimeout) {
          event.propagationStatus = 'completed';
          event.propagatedAt = Date.now();
        }
      }
    } catch (error) {
      console.error('Error processing propagation queue:', error);
    }
  }

  private startSessionUpdateWorker(): void {
    // Process session updates every 500ms
    this.sessionUpdateWorker = setInterval(() => {
      this.processSessionUpdateQueue();
    }, 500);
  }

  private async processSessionUpdateQueue(): Promise<void> {
    try {
      // Sort tasks by priority
      const tasks = Array.from(this.sessionUpdateQueue.values())
        .filter(t => t.status === 'pending')
        .sort((a, b) => {
          const priorityOrder = { high: 0, normal: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

      // Process high-priority tasks immediately
      const highPriorityTasks = tasks.filter(t => t.priority === 'high').slice(0, 10);

      for (const task of highPriorityTasks) {
        await this.executeSessionUpdate(task);
      }

      // Process normal-priority tasks with rate limiting
      const normalTasks = tasks.filter(t => t.priority === 'normal').slice(0, 5);

      for (const task of normalTasks) {
        await this.executeSessionUpdate(task);
      }
    } catch (error) {
      console.error('Error processing session update queue:', error);
    }
  }

  private async executeSessionUpdate(task: SessionUpdateTask): Promise<void> {
    task.status = 'in_progress';

    try {
      // Get session
      const session = sessionManager.getSession(task.sessionId);
      if (!session) {
        // Session no longer exists
        this.sessionUpdateQueue.delete(task.id);
        return;
      }

      // Update session based on update type
      switch (task.updateType) {
        case 'role_change':
          // Invalidate session to force refresh on next access
          sessionManager.invalidateSession(task.sessionId);
          break;

        case 'permission_refresh':
          // Lazy load permissions component
          await sessionManager.loadSessionComponent(task.sessionId, 'permissions');
          break;

        case 'full_sync':
          // Full session sync
          sessionManager.invalidateSession(task.sessionId);
          break;
      }

      task.status = 'completed';
      this.sessionUpdateQueue.delete(task.id);
    } catch (error) {
      console.warn(`Session update failed for task ${task.id}:`, error);

      // Retry with exponential backoff
      if (task.retries < task.maxRetries) {
        task.retries++;
        task.status = 'pending';
      } else {
        // Remove from queue after max retries
        task.status = 'failed';
        this.sessionUpdateQueue.delete(task.id);
      }
    }
  }

  private emitRoleAssignmentEvent(event: RoleAssignmentEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in role assignment event listener:', error);
        }
      }
    }
  }

  private setupRealtimeSubscriptions(): void {
    // Subscribe to org_roles changes
    supabase
      .channel('org_roles_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'org_roles' },
        (payload) => {
          this.handleOrgRoleChange(payload);
        }
      )
      .subscribe();

    // Subscribe to project_roles changes
    supabase
      .channel('project_roles_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_roles' },
        (payload) => {
          this.handleProjectRoleChange(payload);
        }
      )
      .subscribe();

    // Subscribe to system_roles changes
    supabase
      .channel('system_roles_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_roles' },
        (payload) => {
          this.handleSystemRoleChange(payload);
        }
      )
      .subscribe();
  }

  private handleOrgRoleChange(payload: any): void {
    const { eventType, new: newData, old: oldData } = payload;
    const userId = newData?.user_id || oldData?.user_id;
    const orgId = newData?.org_id || oldData?.org_id;

    if (!userId) return;

    // Queue session updates for this user
    this.queueSessionUpdates(userId, `realtime_${Date.now()}`, 'role_change', 'high').catch(err => {
      console.error('Error queuing session updates for org role change:', err);
    });
  }

  private handleProjectRoleChange(payload: any): void {
    const { eventType, new: newData, old: oldData } = payload;
    const userId = newData?.user_id || oldData?.user_id;
    const projectId = newData?.project_id || oldData?.project_id;

    if (!userId) return;

    // Queue session updates for this user
    this.queueSessionUpdates(userId, `realtime_${Date.now()}`, 'role_change', 'high').catch(err => {
      console.error('Error queuing session updates for project role change:', err);
    });
  }

  private handleSystemRoleChange(payload: any): void {
    const { eventType, new: newData, old: oldData } = payload;
    const userId = newData?.user_id || oldData?.user_id;

    if (!userId) return;

    // Queue session updates for this user
    this.queueSessionUpdates(userId, `realtime_${Date.now()}`, 'role_change', 'high').catch(err => {
      console.error('Error queuing session updates for system role change:', err);
    });
  }
}

// Singleton instance
let propagationServiceInstance: RoleAssignmentPropagationService | null = null;

/**
 * Get or create role assignment propagation service instance
 */
export function getRoleAssignmentPropagationService(): RoleAssignmentPropagationService {
  if (!propagationServiceInstance) {
    propagationServiceInstance = new RoleAssignmentPropagationService();
  }
  return propagationServiceInstance;
}

/**
 * Reset role assignment propagation service (for testing)
 */
export function resetRoleAssignmentPropagationService(): void {
  if (propagationServiceInstance) {
    propagationServiceInstance.destroy();
  }
  propagationServiceInstance = null;
}
