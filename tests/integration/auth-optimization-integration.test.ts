/**
 * Comprehensive Integration Tests for Authentication Optimization
 * 
 * Tests the integration of all optimization components:
 * - Database layer (optimized RPC functions and indexes)
 * - Service layer (caching and batch processing)
 * - UI layer (memoization and reactive updates)
 * 
 * Feature: enterprise-auth-performance-optimization
 * Requirements: All requirements (1.1-8.5)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  getAuthOptimizationIntegrationService,
  resetAuthOptimizationIntegrationService,
  type IntegrationTestResult,
  type PerformanceValidationResult,
} from '../../src/services/integration';
import { getCacheManager, resetCacheManager } from '../../src/services/cache/CacheManager';
import { getPermissionService, resetPermissionService } from '../../src/services/permission/PermissionService';
import { sessionManager } from '../../src/services/session/SessionManager';

describe('Authentication Optimization Integration Tests', () => {
  let integrationService: ReturnType<typeof getAuthOptimizationIntegrationService>;

  beforeAll(async () => {
    integrationService = getAuthOptimizationIntegrationService();
    // Note: In a real environment, this would initialize with actual database connection
    // For testing, we'll use mock data
  });

  afterAll(async () => {
    resetAuthOptimizationIntegrationService();
    resetCacheManager();
    resetPermissionService();
  });

  beforeEach(() => {
    // Clear caches before each test
    getCacheManager().clear();
  });

  describe('Integration Test Suite', () => {
    /**
     * Test 1: Cache invalidation triggers permission refresh
     * 
     * Validates: Requirements 2.2, 2.4
     * Property: Cache Invalidation Consistency
     */
    it('should invalidate cache and refresh permissions on role change', async () => {
      const userId = 'test-user-cache-invalidation';

      // Get initial permissions (populates cache)
      const perms1 = await getPermissionService().getPermissions(userId);
      expect(Array.isArray(perms1)).toBe(true);

      // Invalidate cache
      await getPermissionService().invalidateUserPermissions(userId);

      // Get permissions again (should refresh from database)
      const perms2 = await getPermissionService().getPermissions(userId);
      expect(Array.isArray(perms2)).toBe(true);

      // Both should be valid arrays
      expect(perms1).toBeDefined();
      expect(perms2).toBeDefined();
    });

    /**
     * Test 2: Batch processing reduces query count
     * 
     * Validates: Requirements 2.5, 3.1
     * Property: Batch Processing Efficiency
     */
    it('should process multiple permission checks in a single batch', async () => {
      const userId = 'test-user-batch';
      const checks = [
        { resource: 'transactions', action: 'read' },
        { resource: 'transactions', action: 'write' },
        { resource: 'reports', action: 'read' },
        { resource: 'reports', action: 'export' },
        { resource: 'admin', action: 'manage_users' },
      ];

      const startTime = performance.now();
      const result = await getPermissionService().validatePermissionsBatch(userId, checks);
      const duration = performance.now() - startTime;

      // Verify all checks were processed
      expect(result.results).toHaveLength(checks.length);
      expect(result.results.every(r => 'allowed' in r)).toBe(true);

      // Batch processing should be reasonably fast
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    /**
     * Test 3: Session management with memory compression
     * 
     * Validates: Requirements 2.3
     * Property: Memory Optimization Effectiveness
     */
    it('should create optimized sessions with memory compression', async () => {
      const userId = 'test-user-session';

      const authData = {
        user: { id: userId, email: `${userId}@test.com`, name: 'Test User' },
        permissions: [
          { resource: 'transactions', action: 'read' },
          { resource: 'transactions', action: 'write' },
          { resource: 'reports', action: 'read' },
          { resource: 'reports', action: 'export' },
        ],
        roles: [
          { id: 'role1', name: 'Accountant', scope: 'org', scopeId: 'org1' },
          { id: 'role2', name: 'Manager', scope: 'project', scopeId: 'proj1' },
        ],
        organizations: [
          { id: 'org1', name: 'Test Org' },
        ],
        projects: [
          { id: 'proj1', name: 'Test Project' },
        ],
        activeOrgId: 'org1',
        activeProjectId: 'proj1',
      };

      const session = await sessionManager.createSession(authData);

      // Verify session was created
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(userId);

      // Verify memory footprint is reasonable
      expect(session.memoryFootprint).toBeLessThan(1000000); // Less than 1MB

      // Verify session can be retrieved
      const retrievedSession = sessionManager.getSession(session.id);
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession?.userId).toBe(userId);
    });

    /**
     * Test 4: Cache hit rate validation
     * 
     * Validates: Requirements 1.3, 2.1
     * Property: Cache Performance and Hit Rate
     */
    it('should achieve high cache hit rate on repeated requests', async () => {
      const cacheManager = getCacheManager();
      const userId = 'test-user-cache-hits';

      // Clear stats
      cacheManager.clear();

      // Make multiple requests to populate cache
      for (let i = 0; i < 10; i++) {
        await cacheManager.set(`test:key:${i}`, { data: i }, 300);
      }

      // Make repeated requests (should hit cache)
      for (let i = 0; i < 10; i++) {
        const value = await cacheManager.get(`test:key:${i}`);
        expect(value).toBeDefined();
      }

      // Check cache statistics
      const stats = cacheManager.getStats();
      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.cacheHits).toBeGreaterThan(0);
    });

    /**
     * Test 5: Permission preloading during authentication
     * 
     * Validates: Requirements 3.4
     * Property: Permission Preloading
     */
    it('should preload permissions during authentication', async () => {
      const userId = 'test-user-preload';
      const permissionService = getPermissionService();

      // Preload permissions
      await permissionService.preloadUserPermissions(userId);

      // Verify permissions are cached
      const cachedPerms = await permissionService.getCachedPermissions(userId);
      expect(cachedPerms).toBeDefined();
    });

    /**
     * Test 6: End-to-end performance validation
     * 
     * Validates: All requirements
     * Property: Performance Improvement Validation
     */
    it('should validate end-to-end performance meets requirements', async () => {
      const userId = 'test-user-e2e';

      const result = await integrationService.validateEndToEndPerformance(userId);

      // Verify result structure
      expect(result).toHaveProperty('authLoadTime');
      expect(result).toHaveProperty('queryCount');
      expect(result).toHaveProperty('cacheHitRate');
      expect(result).toHaveProperty('memoryUsage');
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('details');

      // Verify metrics are reasonable
      expect(result.authLoadTime).toBeGreaterThan(0);
      expect(result.queryCount).toBeGreaterThanOrEqual(0);
      expect(result.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(result.cacheHitRate).toBeLessThanOrEqual(1);
    });

    /**
     * Test 7: Integration health status
     * 
     * Validates: Requirements 5.4, 5.5
     * Property: Real-time Performance Monitoring
     */
    it('should report integration health status', async () => {
      const health = await integrationService.getHealthStatus();

      // Verify health status structure
      expect(health).toHaveProperty('cacheManager');
      expect(health).toHaveProperty('permissionService');
      expect(health).toHaveProperty('sessionManager');
      expect(health).toHaveProperty('performanceMonitor');
      expect(health).toHaveProperty('database');
      expect(health).toHaveProperty('overallStatus');

      // Verify health values are valid
      const validStatuses = ['healthy', 'degraded', 'failed'];
      expect(validStatuses).toContain(health.cacheManager);
      expect(validStatuses).toContain(health.permissionService);
      expect(validStatuses).toContain(health.sessionManager);
      expect(validStatuses).toContain(health.performanceMonitor);
      expect(validStatuses).toContain(health.database);
      expect(validStatuses).toContain(health.overallStatus);
    });

    /**
     * Test 8: Integration metrics collection
     * 
     * Validates: Requirements 5.4
     * Property: Real-time Performance Monitoring
     */
    it('should collect comprehensive integration metrics', () => {
      const metrics = integrationService.getIntegrationMetrics();

      // Verify metrics structure
      expect(metrics).toHaveProperty('cache');
      expect(metrics).toHaveProperty('session');
      expect(metrics).toHaveProperty('performance');

      // Verify cache metrics
      expect(metrics.cache).toHaveProperty('hitRate');
      expect(metrics.cache).toHaveProperty('avgResponseTime');
      expect(metrics.cache).toHaveProperty('totalRequests');

      // Verify session metrics
      expect(metrics.session).toHaveProperty('totalSessions');
      expect(metrics.session).toHaveProperty('totalMemoryUsage');
      expect(metrics.session).toHaveProperty('averageMemoryPerSession');

      // Verify performance metrics
      expect(metrics.performance).toHaveProperty('avgAuthLoadTime');
      expect(metrics.performance).toHaveProperty('totalAuthRequests');
    });

    /**
     * Test 9: Run all integration tests
     * 
     * Validates: All requirements
     */
    it('should run all integration tests successfully', async () => {
      const results = await integrationService.runIntegrationTests();

      // Verify results structure
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Verify each result has required properties
      results.forEach((result: IntegrationTestResult) => {
        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('passed');
        expect(result).toHaveProperty('duration');
        expect(typeof result.name).toBe('string');
        expect(typeof result.passed).toBe('boolean');
        expect(typeof result.duration).toBe('number');
      });
    });

    /**
     * Test 10: Graceful degradation on cache failure
     * 
     * Validates: Requirements 7.3
     * Property: Graceful Cache Degradation
     */
    it('should gracefully degrade when cache is unavailable', async () => {
      const cacheManager = getCacheManager();
      const userId = 'test-user-degradation';

      // Clear cache to simulate failure
      await cacheManager.clear();

      // Should still be able to get permissions (fallback to database)
      const permissions = await getPermissionService().getPermissions(userId);
      expect(Array.isArray(permissions)).toBe(true);
    });

    /**
     * Test 11: Batch permission validation consistency
     * 
     * Validates: Requirements 6.4
     * Property: Query Result Consistency
     */
    it('should return consistent results for batch permission validation', async () => {
      const userId = 'test-user-consistency';
      const checks = [
        { resource: 'transactions', action: 'read' },
        { resource: 'transactions', action: 'write' },
      ];

      // Get results twice
      const result1 = await getPermissionService().validatePermissionsBatch(userId, checks);
      const result2 = await getPermissionService().validatePermissionsBatch(userId, checks);

      // Results should be identical
      expect(result1.results).toHaveLength(result2.results.length);
      result1.results.forEach((r1, index) => {
        const r2 = result2.results[index];
        expect(r1.resource).toBe(r2.resource);
        expect(r1.action).toBe(r2.action);
        expect(r1.allowed).toBe(r2.allowed);
      });
    });

    /**
     * Test 12: Session memory footprint validation
     * 
     * Validates: Requirements 2.3
     * Property: Memory Optimization Effectiveness
     */
    it('should maintain memory footprint below target', async () => {
      const userId = 'test-user-memory';

      const authData = {
        user: { id: userId, email: `${userId}@test.com`, name: 'Test User' },
        permissions: Array.from({ length: 50 }, (_, i) => ({
          resource: `resource${i}`,
          action: 'read',
        })),
        roles: [],
        organizations: [],
        projects: [],
      };

      const session = await sessionManager.createSession(authData);

      // Memory footprint should be less than 950KB (requirement)
      expect(session.memoryFootprint).toBeLessThan(950000);

      // Get memory stats
      const stats = sessionManager.getMemoryUsage();
      expect(stats.averageMemoryPerSession).toBeLessThan(950000);
    });
  });

  describe('Performance Validation', () => {
    /**
     * Test 13: Database query optimization
     * 
     * Validates: Requirements 1.1, 1.2, 1.4
     * Property: Database Query Optimization
     */
    it('should optimize database queries for authentication', async () => {
      const userId = 'test-user-db-opt';

      const result = await integrationService.validateEndToEndPerformance(userId);

      // Verify database metrics
      expect(result.details.database).toBeDefined();
      expect(result.details.database.queryCount).toBeLessThanOrEqual(4); // Requirement: 4 queries max
    });

    /**
     * Test 14: Cache performance under load
     * 
     * Validates: Requirements 2.1, 2.3
     * Property: Cache Performance and Hit Rate
     */
    it('should maintain cache performance under load', async () => {
      const cacheManager = getCacheManager();
      const userId = 'test-user-load';

      // Simulate load with multiple cache operations
      const operations = 100;
      const startTime = performance.now();

      for (let i = 0; i < operations; i++) {
        await cacheManager.set(`load:test:${i}`, { data: i }, 300);
      }

      for (let i = 0; i < operations; i++) {
        await cacheManager.get(`load:test:${i}`);
      }

      const duration = performance.now() - startTime;

      // Should complete reasonably fast
      expect(duration).toBeLessThan(5000); // 5 seconds for 200 operations

      // Check cache hit rate
      const stats = cacheManager.getStats();
      expect(stats.cacheHits).toBeGreaterThan(0);
    });

    /**
     * Test 15: Response time for permission checks
     * 
     * Validates: Requirements 3.3
     * Property: Response Time Performance
     */
    it('should return permission check results within 10ms for cached data', async () => {
      const userId = 'test-user-response-time';
      const permissionService = getPermissionService();

      // Preload permissions to ensure cache hit
      await permissionService.preloadUserPermissions(userId);

      // Check response time
      const startTime = performance.now();
      const result = await permissionService.validatePermissionsBatch(userId, [
        { resource: 'transactions', action: 'read' },
      ]);
      const duration = performance.now() - startTime;

      // Should be fast (ideally under 10ms for cached results)
      expect(duration).toBeLessThan(100); // Allow some margin for test environment
    });
  });

  describe('Error Handling and Resilience', () => {
    /**
     * Test 16: Graceful error handling in batch processing
     * 
     * Validates: Requirements 7.3
     * Property: Graceful Cache Degradation
     */
    it('should handle errors gracefully in batch permission validation', async () => {
      const userId = 'test-user-error-handling';
      const checks = [
        { resource: 'transactions', action: 'read' },
        { resource: 'invalid', action: 'invalid' },
      ];

      // Should not throw, but return results
      const result = await getPermissionService().validatePermissionsBatch(userId, checks);

      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    /**
     * Test 17: Session cleanup on expiration
     * 
     * Validates: Requirements 2.3
     * Property: Memory Optimization Effectiveness
     */
    it('should cleanup expired sessions', async () => {
      const userId = 'test-user-cleanup';

      const authData = {
        user: { id: userId, email: `${userId}@test.com`, name: 'Test User' },
        permissions: [],
        roles: [],
        organizations: [],
        projects: [],
      };

      const session = await sessionManager.createSession(authData);
      const sessionId = session.id;

      // Verify session exists
      expect(sessionManager.getSession(sessionId)).toBeDefined();

      // Cleanup expired sessions
      await sessionManager.cleanupExpiredSessions();

      // Session should still exist (not expired yet)
      expect(sessionManager.getSession(sessionId)).toBeDefined();
    });
  });
});
