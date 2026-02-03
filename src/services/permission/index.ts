/**
 * Permission Service Module
 * 
 * Exports the permission service and related types for batch permission
 * validation, preloading, and reactive updates.
 */

export {
  PermissionService,
  getPermissionService,
  resetPermissionService,
  permissionService,
  type PermissionCheck,
  type PermissionResult,
  type PermissionChange,
  type BatchPermissionRequest,
  type BatchPermissionResponse,
} from './PermissionService';
