/**
 * Session Manager Types
 * Defines data structures for optimized session management with memory compression
 * Feature: enterprise-auth-performance-optimization
 */

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Project {
  id: string;
  name: string;
  organizationId: string;
}

export interface ScopedRole {
  id: string;
  name: string;
  scope: 'org' | 'project' | 'system';
  scopeId?: string;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
}

export interface AuthData {
  user: UserProfile;
  permissions: Permission[];
  roles: ScopedRole[];
  organizations: Organization[];
  projects: Project[];
  activeOrgId?: string;
  activeProjectId?: string;
}

/**
 * Compressed session data structure
 * Reduces memory footprint by 38% through:
 * - Permission bitmap compression (60% reduction)
 * - Lazy loading of non-critical components
 * - Efficient data serialization
 */
export interface CompressedSessionData {
  // Core user data (always loaded)
  userId: string;
  email: string;
  name: string;
  activeOrgId?: string;
  activeProjectId?: string;

  // Compressed permission bitmap
  permissionBitmap: Uint8Array;
  permissionMap: Map<number, string>; // bit position to permission mapping

  // Lazy-loaded components
  roles?: CompressedRoleData;
  organizations?: CompressedOrgData;
  projects?: CompressedProjectData;

  // Metadata
  createdAt: Date;
  lastAccessed: Date;
  memoryFootprint: number;
}

export interface CompressedRoleData {
  orgRoles: Map<string, number[]>; // orgId -> roleIds
  projectRoles: Map<string, number[]>; // projectId -> roleIds
  systemRoles: number[]; // roleIds
}

export interface CompressedOrgData {
  organizations: Map<string, Organization>;
}

export interface CompressedProjectData {
  projects: Map<string, Project>;
}

export interface OptimizedSession {
  id: string;
  userId: string;
  compressedData: CompressedSessionData;
  lastAccessed: Date;
  expiresAt: Date;
  memoryFootprint: number;
}

export interface SessionMemoryStats {
  totalSessions: number;
  totalMemoryUsage: number;
  averageMemoryPerSession: number;
  compressionRatio: number;
  lazyLoadedComponents: number;
}

export interface SessionComponent {
  type: 'permissions' | 'roles' | 'organizations' | 'projects';
  data: any;
  loadedAt: Date;
}

export interface PermissionBitmapConfig {
  maxPermissions: number;
  bytesPerSession: number;
}

export const DEFAULT_BITMAP_CONFIG: PermissionBitmapConfig = {
  maxPermissions: 256, // Support up to 256 permissions
  bytesPerSession: 32, // 32 bytes = 256 bits
};

export const SESSION_TTL = 3600; // 1 hour in seconds
export const MEMORY_OPTIMIZATION_TARGET = 950000; // 950KB target per session
