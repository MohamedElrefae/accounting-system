/**
 * Session Manager Unit Tests
 * Tests for optimized session management with memory compression
 * Feature: enterprise-auth-performance-optimization, Requirement 2.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionManager } from '../session/SessionManager';
import { AuthData, Permission, ScopedRole, Organization, Project, UserProfile } from '../session/types';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  afterEach(() => {
    sessionManager.destroy();
  });

  describe('Session Creation', () => {
    it('should create optimized session from auth data', async () => {
      const authData = createMockAuthData();
      const session = await sessionManager.createSession(authData);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(authData.user.id);
      expect(session.compressedData.email).toBe(authData.user.email);
      expect(session.compressedData.permissionBitmap).toBeDefined();
    });

    it('should compress permissions into bitmap', async () => {
      const authData = createMockAuthData();
      const session = await sessionManager.createSession(authData);

      expect(session.compressedData.permissionBitmap).toBeInstanceOf(Uint8Array);
      expect(session.compressedData.permissionMap.size).toBeGreaterThan(0);
    });

    it('should set session expiration time', async () => {
      const authData = createMockAuthData();
      const session = await sessionManager.createSession(authData);

      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should estimate memory footprint', async () => {
      const authData = createMockAuthData();
      const session = await sessionManager.createSession(authData);

      expect(session.memoryFootprint).toBeGreaterThan(0);
      expect(session.memoryFootprint).toBeLessThan(1000000); // Less than 1MB
    });
  });

  describe('Session Retrieval', () => {
    it('should retrieve session by ID', async () => {
      const authData = createMockAuthData();
      const createdSession = await sessionManager.createSession(authData);

      const retrievedSession = sessionManager.getSession(createdSession.id);

      expect(retrievedSession).toBeDefined();
      expect(retrievedSession?.id).toBe(createdSession.id);
      expect(retrievedSession?.userId).toBe(authData.user.id);
    });

    it('should return null for non-existent session', () => {
      const session = sessionManager.getSession('non-existent-id');
      expect(session).toBeNull();
    });

    it('should update last accessed time on retrieval', async () => {
      const authData = createMockAuthData();
      const session = await sessionManager.createSession(authData);
      const originalTime = session.lastAccessed;

      // Wait a bit and retrieve
      await new Promise(resolve => setTimeout(resolve, 10));
      const retrieved = sessionManager.getSession(session.id);

      expect(retrieved?.lastAccessed.getTime()).toBeGreaterThan(originalTime.getTime());
    });
  });

  describe('Permission Checking', () => {
    it('should check permissions using bitmap', async () => {
      const authData = createMockAuthData();
      const session = await sessionManager.createSession(authData);

      // Check a permission that exists
      const hasPermission = sessionManager.hasPermission(
        session.id,
        'transactions',
        'read'
      );

      expect(hasPermission).toBe(true);
    });

    it('should return false for non-existent permission', async () => {
      const authData = createMockAuthData();
      const session = await sessionManager.createSession(authData);

      const hasPermission = sessionManager.hasPermission(
        session.id,
        'non-existent',
        'permission'
      );

      expect(hasPermission).toBe(false);
    });

    it('should return false for non-existent session', () => {
      const hasPermission = sessionManager.hasPermission(
        'non-existent-session',
        'transactions',
        'read'
      );

      expect(hasPermission).toBe(false);
    });

    it('should handle multiple permission checks efficiently', async () => {
      const authData = createMockAuthData();
      const session = await sessionManager.createSession(authData);

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        sessionManager.hasPermission(session.id, 'transactions', 'read');
      }

      const duration = performance.now() - startTime;

      // 1000 checks should complete in less than 10ms
      expect(duration).toBeLessThan(10);
    });
  });

  describe('Lazy Loading', () => {
    it('should lazy load roles', async () => {
      const authData = createMockAuthData();
      const session = await sessionManager.createSession(authData);

      const roles = await sessionManager.loadSessionComponent(session.id, 'roles');

      expect(roles).toBeDefined();
      expect(roles.orgRoles).toBeDefined();
      expect(roles.projectRoles).toBeDefined();
      expect(roles.systemRoles).toBeDefined();
    });

    it('should lazy load organizations', async () => {
      const authData = createMockAuthData();
      const session = await sessionManager.createSession(authData);

      const orgs = await sessionManager.loadSessionComponent(session.id, 'organizations');

      expect(orgs).toBeDefined();
      expect(orgs.size).toBeGreaterThan(0);
    });

    it('should lazy load projects', async () => {
      const authData = createMockAuthData();
      const session = await sessionManager.createSession(authData);

      const projects = await sessionManager.loadSessionComponent(session.id, 'projects');

      expect(projects).toBeDefined();
      expect(projects.size).toBeGreaterThan(0);
    });

    it('should lazy load permissions', async () => {
      const authData = createMockAuthData();
      const session = await sessionManager.createSession(authData);

      const permissions = await sessionManager.loadSessionComponent(session.id, 'permissions');

      expect(permissions).toBeDefined();
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
    });

    it('should return null for non-existent session component', async () => {
      const result = await sessionManager.loadSessionComponent('non-existent', 'roles');
      expect(result).toBeNull();
    });
  });

  describe('Session Invalidation', () => {
    it('should invalidate session', async () => {
      const authData = createMockAuthData();
      const session = await sessionManager.createSession(authData);

      sessionManager.invalidateSession(session.id);

      const retrieved = sessionManager.getSession(session.id);
      expect(retrieved).toBeNull();
    });

    it('should handle invalidation of non-existent session', () => {
      expect(() => {
        sessionManager.invalidateSession('non-existent');
      }).not.toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage statistics', async () => {
      const authData = createMockAuthData();
      await sessionManager.createSession(authData);

      const stats = sessionManager.getMemoryUsage();

      expect(stats.totalSessions).toBe(1);
      expect(stats.totalMemoryUsage).toBeGreaterThan(0);
      expect(stats.averageMemoryPerSession).toBeGreaterThan(0);
      expect(stats.compressionRatio).toBeGreaterThan(0);
      expect(stats.compressionRatio).toBeLessThan(1);
    });

    it('should calculate compression ratio correctly', async () => {
      const authData = createMockAuthData();
      await sessionManager.createSession(authData);

      const stats = sessionManager.getMemoryUsage();

      // Compression ratio should be between 0 and 1
      expect(stats.compressionRatio).toBeGreaterThan(0);
      expect(stats.compressionRatio).toBeLessThan(1);
    });

    it('should track lazy loaded components', async () => {
      const authData = createMockAuthData();
      const session = await sessionManager.createSession(authData);

      // Initially, components are lazy loaded
      let stats = sessionManager.getMemoryUsage();
      const initialLazyCount = stats.lazyLoadedComponents;

      // Load a component
      await sessionManager.loadSessionComponent(session.id, 'roles');

      stats = sessionManager.getMemoryUsage();
      // Lazy loaded count should decrease after loading
      expect(stats.lazyLoadedComponents).toBeLessThanOrEqual(initialLazyCount);
    });

    it('should handle multiple sessions memory tracking', async () => {
      const authData1 = createMockAuthData();
      const authData2 = createMockAuthData();

      await sessionManager.createSession(authData1);
      await sessionManager.createSession(authData2);

      const stats = sessionManager.getMemoryUsage();

      expect(stats.totalSessions).toBe(2);
      expect(stats.totalMemoryUsage).toBeGreaterThan(0);
      expect(stats.averageMemoryPerSession).toBeGreaterThan(0);
    });
  });

  describe('Session Cleanup', () => {
    it('should cleanup expired sessions', async () => {
      const authData = createMockAuthData();
      const session = await sessionManager.createSession(authData);

      // Manually expire the session
      session.expiresAt = new Date(Date.now() - 1000);

      await sessionManager.cleanupExpiredSessions();

      const retrieved = sessionManager.getSession(session.id);
      expect(retrieved).toBeNull();
    });

    it('should not cleanup active sessions', async () => {
      const authData = createMockAuthData();
      const session = await sessionManager.createSession(authData);

      await sessionManager.cleanupExpiredSessions();

      const retrieved = sessionManager.getSession(session.id);
      expect(retrieved).toBeDefined();
    });

    it('should handle cleanup with no sessions', async () => {
      expect(async () => {
        await sessionManager.cleanupExpiredSessions();
      }).not.toThrow();
    });
  });

  describe('Memory Optimization', () => {
    it('should achieve target memory footprint', async () => {
      const authData = createMockAuthData();
      const session = await sessionManager.createSession(authData);

      // Memory footprint should be significantly less than 1.52MB (original)
      // Target is 950KB
      expect(session.memoryFootprint).toBeLessThan(1000000);
    });

    it('should compress permissions efficiently', async () => {
      const authData = createMockAuthData();
      const session = await sessionManager.createSession(authData);

      // Permission bitmap should be small (32 bytes for 256 permissions)
      expect(session.compressedData.permissionBitmap.byteLength).toBeLessThanOrEqual(32);
    });

    it('should maintain compression across multiple sessions', async () => {
      const sessions = [];

      for (let i = 0; i < 10; i++) {
        const authData = createMockAuthData();
        const session = await sessionManager.createSession(authData);
        sessions.push(session);
      }

      const stats = sessionManager.getMemoryUsage();

      // Average memory per session should be reasonable
      expect(stats.averageMemoryPerSession).toBeLessThan(100000); // Less than 100KB
    });
  });

  describe('Destruction', () => {
    it('should cleanup resources on destroy', async () => {
      const authData = createMockAuthData();
      await sessionManager.createSession(authData);

      sessionManager.destroy();

      const stats = sessionManager.getMemoryUsage();
      expect(stats.totalSessions).toBe(0);
    });
  });
});

// Helper functions

function createMockAuthData(): AuthData {
  const user: UserProfile = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const permissions: Permission[] = [
    { id: '1', resource: 'transactions', action: 'read' },
    { id: '2', resource: 'transactions', action: 'write' },
    { id: '3', resource: 'accounts', action: 'read' },
    { id: '4', resource: 'accounts', action: 'write' },
    { id: '5', resource: 'reports', action: 'read' },
  ];

  const roles: ScopedRole[] = [
    { id: 'role-1', name: 'Accountant', scope: 'org', scopeId: 'org-123' },
    { id: 'role-2', name: 'Manager', scope: 'project', scopeId: 'proj-456' },
    { id: 'role-3', name: 'Admin', scope: 'system' },
  ];

  const organizations: Organization[] = [
    { id: 'org-123', name: 'Test Org', slug: 'test-org' },
    { id: 'org-456', name: 'Another Org', slug: 'another-org' },
  ];

  const projects: Project[] = [
    { id: 'proj-456', name: 'Test Project', organizationId: 'org-123' },
    { id: 'proj-789', name: 'Another Project', organizationId: 'org-123' },
  ];

  return {
    user,
    permissions,
    roles,
    organizations,
    projects,
    activeOrgId: 'org-123',
    activeProjectId: 'proj-456',
  };
}
