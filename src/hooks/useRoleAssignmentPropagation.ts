/**
 * Hook for Role Assignment Propagation
 * 
 * Provides real-time role assignment updates and session synchronization
 * Feature: enterprise-auth-performance-optimization, Property 12: Role Assignment Propagation
 */

import { useEffect, useCallback, useRef } from 'react';
import {
  getRoleAssignmentPropagationService,
  type RoleAssignmentEvent,
} from '@/services/roleAssignment';

export interface UseRoleAssignmentPropagationOptions {
  userId?: string;
  sessionId?: string;
  onRoleChange?: (event: RoleAssignmentEvent) => void;
  onPropagationComplete?: (eventId: string) => void;
}

/**
 * Hook for subscribing to role assignment propagation events
 * 
 * Automatically registers/unregisters user sessions and handles
 * real-time role updates with automatic session synchronization
 */
export function useRoleAssignmentPropagation(options: UseRoleAssignmentPropagationOptions) {
  const propagationService = getRoleAssignmentPropagationService();
  const unsubscribeRef = useRef<(() => void)[]>([]);

  // Register session on mount
  useEffect(() => {
    if (options.userId && options.sessionId) {
      propagationService.registerUserSession(options.userId, options.sessionId);

      return () => {
        propagationService.unregisterUserSession(options.userId!, options.sessionId!);
      };
    }
  }, [options.userId, options.sessionId, propagationService]);

  // Subscribe to role assignment events
  useEffect(() => {
    const eventTypes: RoleAssignmentEvent['type'][] = [
      'org_role_assigned',
      'org_role_updated',
      'org_role_removed',
      'project_role_assigned',
      'project_role_updated',
      'project_role_removed',
      'system_role_assigned',
      'system_role_removed',
    ];

    const unsubscribers: (() => void)[] = [];

    for (const eventType of eventTypes) {
      const unsubscribe = propagationService.subscribe(eventType, (event) => {
        // Only handle events for this user
        if (options.userId && event.userId === options.userId) {
          options.onRoleChange?.(event);

          // Check if propagation is complete
          if (event.propagationStatus === 'completed' && options.onPropagationComplete) {
            options.onPropagationComplete(event.id);
          }
        }
      });

      unsubscribers.push(unsubscribe);
    }

    unsubscribeRef.current = unsubscribers;

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [options.userId, options.onRoleChange, options.onPropagationComplete, propagationService]);

  // Get current queue status
  const getQueueStatus = useCallback(() => {
    return propagationService.getQueueStatus();
  }, [propagationService]);

  // Get event status
  const getEventStatus = useCallback((eventId: string) => {
    return propagationService.getEventStatus(eventId);
  }, [propagationService]);

  return {
    getQueueStatus,
    getEventStatus,
  };
}
