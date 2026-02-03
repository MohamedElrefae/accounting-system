/**
 * Role Assignment Services
 * 
 * Exports role assignment propagation service for real-time role updates
 */

export {
  RoleAssignmentPropagationService,
  getRoleAssignmentPropagationService,
  resetRoleAssignmentPropagationService,
  type RoleAssignmentEvent,
  type SessionUpdateTask,
  type DistributedSessionSync,
} from './RoleAssignmentPropagationService';
