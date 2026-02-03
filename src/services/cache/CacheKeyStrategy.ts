/**
 * Cache Key Strategy
 * 
 * Implements hierarchical cache keys for efficient invalidation
 * and organized cache management
 */

export interface CacheKeyStrategy {
  userAuth: (userId: string) => string;
  userPermissions: (userId: string, scope?: string) => string;
  roleHierarchy: (userId: string, roleType: string) => string;
  orgMembership: (userId: string, orgId: string) => string;
  projectMembership: (userId: string, projectId: string) => string;
  permissionBatch: (userId: string, checksum: string) => string;
  sessionData: (sessionId: string) => string;
}

/**
 * Cache TTL configuration (in seconds)
 */
export const CACHE_TTL = {
  userAuth: 300, // 5 minutes
  permissions: 600, // 10 minutes
  roles: 900, // 15 minutes
  organizations: 1800, // 30 minutes
  sessions: 3600, // 1 hour
  permissionBatch: 300, // 5 minutes
} as const;

/**
 * Cache key strategy implementation
 */
export const cacheKeyStrategy: CacheKeyStrategy = {
  /**
   * User authentication data cache key
   * Pattern: auth:user:{userId}
   */
  userAuth: (userId: string) => `auth:user:${userId}`,

  /**
   * User permissions cache key with optional scope
   * Pattern: perm:{userId}:{scope}
   */
  userPermissions: (userId: string, scope?: string) => {
    const scopeStr = scope || 'global';
    return `perm:${userId}:${scopeStr}`;
  },

  /**
   * Role hierarchy cache key
   * Pattern: roles:{userId}:{roleType}
   */
  roleHierarchy: (userId: string, roleType: string) => {
    return `roles:${userId}:${roleType}`;
  },

  /**
   * Organization membership cache key
   * Pattern: org:${userId}:${orgId}
   */
  orgMembership: (userId: string, orgId: string) => {
    return `org:${userId}:${orgId}`;
  },

  /**
   * Project membership cache key
   * Pattern: project:${userId}:${projectId}
   */
  projectMembership: (userId: string, projectId: string) => {
    return `project:${userId}:${projectId}`;
  },

  /**
   * Batch permission check cache key
   * Pattern: batch:perm:${userId}:${checksum}
   */
  permissionBatch: (userId: string, checksum: string) => {
    return `batch:perm:${userId}:${checksum}`;
  },

  /**
   * Session data cache key
   * Pattern: session:${sessionId}
   */
  sessionData: (sessionId: string) => {
    return `session:${sessionId}`;
  },
};

/**
 * Cache invalidation patterns for different scenarios
 */
export const cacheInvalidationPatterns = {
  /**
   * Invalidate all auth data for a user
   */
  userAuthPattern: (userId: string) => `auth:user:${userId}*`,

  /**
   * Invalidate all permissions for a user
   */
  userPermissionsPattern: (userId: string) => `perm:${userId}:*`,

  /**
   * Invalidate all roles for a user
   */
  userRolesPattern: (userId: string) => `roles:${userId}:*`,

  /**
   * Invalidate all organization memberships for a user
   */
  userOrgPattern: (userId: string) => `org:${userId}:*`,

  /**
   * Invalidate all project memberships for a user
   */
  userProjectPattern: (userId: string) => `project:${userId}:*`,

  /**
   * Invalidate all cache for a user (comprehensive)
   */
  userAllPattern: (userId: string) => `*:${userId}:*`,

  /**
   * Invalidate all permissions in an organization
   */
  orgPermissionsPattern: (orgId: string) => `perm:*:${orgId}:*`,

  /**
   * Invalidate all permissions in a project
   */
  projectPermissionsPattern: (projectId: string) => `perm:*:*:${projectId}`,

  /**
   * Invalidate all batch permission checks
   */
  batchPermissionsPattern: () => `batch:perm:*`,

  /**
   * Invalidate all sessions
   */
  allSessionsPattern: () => `session:*`,
};

/**
 * Helper function to compute checksum for batch permission checks
 */
export function computePermissionChecksum(permissions: string[]): string {
  const sorted = [...permissions].sort();
  const combined = sorted.join('|');
  
  // Simple hash function (in production, use crypto.createHash)
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Cache key builder for complex scenarios
 */
export class CacheKeyBuilder {
  private parts: string[] = [];

  add(part: string): this {
    this.parts.push(part);
    return this;
  }

  addIf(condition: boolean, part: string): this {
    if (condition) {
      this.parts.push(part);
    }
    return this;
  }

  build(): string {
    return this.parts.join(':');
  }

  buildPattern(): string {
    return this.parts.join(':') + '*';
  }
}

/**
 * Example usage:
 * 
 * const key = new CacheKeyBuilder()
 *   .add('auth')
 *   .add(userId)
 *   .addIf(orgId, orgId)
 *   .build();
 * // Result: "auth:user123" or "auth:user123:org456"
 */
